/**
 * PIVY Stealth Address Helpers (Aptos)
 * ------------------------------------
 * secp256k1-based stealth address utilities for Aptos generalized auth.
 *
 * Key differences vs Sui:
 * - Aptos account address = sha3-256(0x01 | secp256k1_raw_pubkey(64B) | 0x02)
 * - We instantiate a real Aptos Account (Secp256k1) from the derived stealth private key.
 *
 * Dependencies:
 * @noble/secp256k1, @noble/hashes, @noble/ciphers, bs58, @aptos-labs/ts-sdk
 */

import * as secp from "@noble/secp256k1";
import { sha256 } from "@noble/hashes/sha256";
import { sha3_256 } from "@noble/hashes/sha3";
import { hkdf } from "@noble/hashes/hkdf";
import { randomBytes } from "@noble/hashes/utils";
import { chacha20poly1305 } from "@noble/ciphers/chacha";
import bs58 from "bs58";
import { Buffer } from "buffer";

// ────────────────────────────────────────────────────────────────
// Deterministic Key Derivation Constants
// ────────────────────────────────────────────────────────────────
const SPEND_CONTEXT = "PIVY Spend Authority | Deterministic Derivation";
const VIEW_CONTEXT = "PIVY View Authority | Deterministic Derivation";
const APTOS_DOMAIN = "PIVY | Deterministic Meta Keys | Aptos Network";

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────
export interface MetaKeys {
  metaSpend: { privateKey: Uint8Array; publicKey: Uint8Array };
  metaView: { privateKey: Uint8Array; publicKey: Uint8Array };
  metaSpendPubB58: string;
  metaViewPubB58: string;
  seed?: string;
}

export interface StealthPublicKey {
  stealthPubKeyB58: string;
  stealthAptosAddress: string;
  stealthPubKeyBytes: Uint8Array;
}

export interface EphemeralKey {
  privateKey: Uint8Array;
  publicKeyB58: string;
}

export class PivyStealthAptos {
  // ────────────────────────────────────────────────────────────────
  // Encoding / utils
  // ────────────────────────────────────────────────────────────────
  toBytes(str: string): Uint8Array {
    return new TextEncoder().encode(str);
  }

  pad32(u8: Uint8Array): Uint8Array {
    const out = new Uint8Array(32);
    out.set(u8.slice(0, 32));
    return out;
  }

  to32u8(
    raw: string | Uint8Array | { type: string; data: number[] }
  ): Uint8Array {
    if (raw instanceof Uint8Array) {
      return raw.length === 32 ? raw : this.pad32(raw);
    }
    if (typeof raw === "string") {
      // hex without 0x
      const hex = raw.startsWith("0x") ? raw.slice(2) : raw;
      if (/^[0-9a-fA-F]+$/.test(hex)) {
        return Uint8Array.from(Buffer.from(hex, "hex"));
      }
      // base58 fallback (33B public keys or 32B priv)
      try {
        return bs58.decode(raw);
      } catch {
        throw new Error("Failed to decode base58 string");
      }
    }
    if (raw?.type === "Buffer") {
      return Uint8Array.from(raw.data);
    }
    throw new Error(
      "Unsupported key format; expected 32-byte Uint8Array, hex, or base58."
    );
  }

  // ────────────────────────────────────────────────────────────────
  // Aptos address derivation for SingleKey Secp256k1 authentication
  // AuthenticationKey = sha3-256(AnyPublicKey_bytes || SingleKey_scheme)
  // AnyPublicKey_bytes = uleb128(1) || 0x41 || uncompressed_secp256k1_pubkey_65B
  // SingleKey_scheme = 2
  // ────────────────────────────────────────────────────────────────
  secp256k1PointToAptosAddress(compressed33: Uint8Array): string {
    // Convert to uncompressed format (65 bytes with 0x04 prefix)
    const pt = secp.Point.fromHex(compressed33);
    const uncompressed65 = pt.toRawBytes(false); // 0x04 || X(32) || Y(32)

    // Build AnyPublicKey bytes: uleb128(1) || length_byte(0x41) || secp256k1_pubkey(65 bytes)
    // This matches SDK's serialization format
    const anyPublicKeyBytes = new Uint8Array(1 + 1 + 65);
    anyPublicKeyBytes[0] = 0x01; // uleb128(1) for Secp256k1 variant
    anyPublicKeyBytes[1] = 0x41; // Length of Secp256k1PublicKey (65 = 0x41)
    anyPublicKeyBytes.set(uncompressed65, 2); // 65-byte uncompressed public key

    // Build final input: AnyPublicKey_bytes || SingleKey_scheme(2)
    const authKeyInput = new Uint8Array(anyPublicKeyBytes.length + 1);
    authKeyInput.set(anyPublicKeyBytes, 0);
    authKeyInput[anyPublicKeyBytes.length] = 0x02; // SingleKey scheme = 2

    const authKey = sha3_256(authKeyInput);
    return "0x" + Buffer.from(authKey).toString("hex");
  }

  // ────────────────────────────────────────────────────────────────
  // Crypto: ephemeral key encryption & memo encryption
  // ────────────────────────────────────────────────────────────────
  async encryptEphemeralPrivKey(
    ephPriv32: string | Uint8Array,
    metaViewPubCompressed: string | Uint8Array
  ): Promise<string> {
    const ephPriv = this.to32u8(ephPriv32);
    const metaViewPub = this.to32u8(metaViewPubCompressed);
    const ephPub = secp.getPublicKey(ephPriv, true); // 33B

    const shared = secp.getSharedSecret(ephPriv, metaViewPub, true); // 33+1B
    const salt = sha256(ephPub);
    const key = hkdf(
      sha256,
      shared.slice(1),
      salt,
      "ephemeral-key-encryption",
      32
    );

    const plaintext = new Uint8Array([...ephPriv, ...ephPub]); // 32 + 33
    const nonce = randomBytes(12);
    const cipher = chacha20poly1305(key, nonce);
    const ct = cipher.encrypt(plaintext);
    return bs58.encode(new Uint8Array([...nonce, ...ct]));
  }

  async decryptEphemeralPrivKey(
    encodedPayloadB58OrBytes:
      | string
      | Uint8Array
      | { type: string; data: number[] },
    metaViewPriv32: string | Uint8Array,
    ephPubCompressed: string | Uint8Array
  ): Promise<Uint8Array> {
    const metaViewPriv = this.to32u8(metaViewPriv32);
    const ephPub = this.to32u8(ephPubCompressed);

    let payloadU8: Uint8Array;
    if (encodedPayloadB58OrBytes instanceof Uint8Array) {
      payloadU8 = encodedPayloadB58OrBytes;
    } else if (typeof encodedPayloadB58OrBytes === "string") {
      payloadU8 = bs58.decode(encodedPayloadB58OrBytes);
    } else if (encodedPayloadB58OrBytes?.type === "Buffer") {
      payloadU8 = Uint8Array.from(encodedPayloadB58OrBytes.data);
    } else {
      throw new Error("encryptedPayload must be base58 string or Uint8Array");
    }

    if (payloadU8.length < 28) {
      throw new Error("Encrypted payload too short");
    }

    const nonce = payloadU8.slice(0, 12);
    const ct = payloadU8.slice(12);

    const shared = secp.getSharedSecret(metaViewPriv, ephPub, true);
    const salt = sha256(ephPub);
    const key = hkdf(
      sha256,
      shared.slice(1),
      salt,
      "ephemeral-key-encryption",
      32
    );

    const cipher = chacha20poly1305(key, nonce);
    const pt = cipher.decrypt(ct);

    const ephPriv = pt.slice(0, 32);
    const pubRecv = pt.slice(32);
    const pubCalc = secp.getPublicKey(ephPriv, true);
    if (!pubRecv.every((b, i) => b === pubCalc[i])) {
      throw new Error("Ephemeral public key mismatch");
    }
    return ephPriv;
  }

  async encryptNote(
    plaintext: string,
    ephPriv32: string | Uint8Array,
    metaViewPubCompressed: string | Uint8Array
  ): Promise<Uint8Array> {
    const ephPriv = this.to32u8(ephPriv32);
    const metaViewPub = this.to32u8(metaViewPubCompressed);
    const ephPub = secp.getPublicKey(ephPriv, true);

    const shared = secp.getSharedSecret(ephPriv, metaViewPub, true);
    const salt = sha256(ephPub);
    const key = hkdf(sha256, shared.slice(1), salt, "memo-encryption", 32);

    const nonce = randomBytes(12);
    const cipher = chacha20poly1305(key, nonce);
    const ct = cipher.encrypt(this.toBytes(plaintext));
    return new Uint8Array([...nonce, ...ct]);
  }

  async decryptNote(
    encryptedBytes: Uint8Array,
    ephPubCompressed: string | Uint8Array,
    metaViewPriv32: string | Uint8Array
  ): Promise<string> {
    const ephPub = this.to32u8(ephPubCompressed);
    const metaViewPriv = this.to32u8(metaViewPriv32);

    const nonce = encryptedBytes.slice(0, 12);
    const ct = encryptedBytes.slice(12);

    const shared = secp.getSharedSecret(metaViewPriv, ephPub, true);
    const salt = sha256(ephPub);
    const key = hkdf(sha256, shared.slice(1), salt, "memo-encryption", 32);

    const cipher = chacha20poly1305(key, nonce);
    const pt = cipher.decrypt(ct);
    return new TextDecoder().decode(pt);
  }

  // ────────────────────────────────────────────────────────────────
  // Stealth address derivation
  // ────────────────────────────────────────────────────────────────
  async deriveStealthPub(
    metaSpendPubB58: string,
    metaViewPubB58: string,
    ephPriv32: string | Uint8Array
  ): Promise<StealthPublicKey> {
    const shared = secp.getSharedSecret(
      this.to32u8(ephPriv32),
      this.to32u8(metaViewPubB58),
      true
    );
    const tweak = sha256(shared.slice(1));

    const tweakScalar = secp.utils.mod(
      BigInt("0x" + Buffer.from(tweak).toString("hex")),
      secp.CURVE.n
    );

    // Derive stealth public key: metaSpendPub + tweak*G
    const tweakPoint = secp.Point.BASE.multiply(tweakScalar);
    const metaSpendPoint = secp.Point.fromHex(this.to32u8(metaSpendPubB58));
    const stealthPoint = metaSpendPoint.add(tweakPoint);

    const stealthPubBytes = stealthPoint.toRawBytes(true); // compressed
    const stealthAptosAddress =
      this.secp256k1PointToAptosAddress(stealthPubBytes);

    return {
      stealthPubKeyB58: bs58.encode(stealthPubBytes),
      stealthAptosAddress,
      stealthPubKeyBytes: stealthPubBytes,
    };
  }

  async deriveStealthKeypair(
    metaSpendPriv32: string | Uint8Array,
    metaViewPriv32: string | Uint8Array,
    ephPubCompressedB58OrU8: string | Uint8Array
  ): Promise<{
    stealthPrivBytes: Uint8Array;
    stealthAddress: string;
    publicKeyBase58: string;
  }> {
    const shared = secp.getSharedSecret(
      this.to32u8(metaViewPriv32),
      this.to32u8(ephPubCompressedB58OrU8),
      true
    );
    const tweak = sha256(shared.slice(1));

    const tweakScalar = secp.utils.mod(
      BigInt("0x" + Buffer.from(tweak).toString("hex")),
      secp.CURVE.n
    );

    const spendPriv = this.to32u8(metaSpendPriv32);
    const spendScalar = secp.utils.mod(
      BigInt("0x" + Buffer.from(spendPriv).toString("hex")),
      secp.CURVE.n
    );

    const stealthScalar = secp.utils.mod(
      spendScalar + tweakScalar,
      secp.CURVE.n
    );
    const stealthHex = stealthScalar.toString(16).padStart(64, "0");
    const stealthPrivBytes = Uint8Array.from(Buffer.from(stealthHex, "hex"));

    // Get public key and derive address
    const stealthPubKey = secp.getPublicKey(stealthPrivBytes, true);
    const stealthAddress = this.secp256k1PointToAptosAddress(stealthPubKey);

    return {
      stealthPrivBytes,
      stealthAddress,
      publicKeyBase58: bs58.encode(stealthPubKey),
    };
  }

  // ────────────────────────────────────────────────────────────────
  // Key generation (secp256k1 meta & ephemeral)
  // ────────────────────────────────────────────────────────────────
  generateMetaKeys(): MetaKeys {
    const metaSpendPriv = secp.utils.randomPrivateKey();
    const metaViewPriv = secp.utils.randomPrivateKey();

    const spendPub = secp.getPublicKey(metaSpendPriv, true);
    const viewPub = secp.getPublicKey(metaViewPriv, true);

    return {
      metaSpend: { privateKey: metaSpendPriv, publicKey: spendPub },
      metaView: { privateKey: metaViewPriv, publicKey: viewPub },
      metaSpendPubB58: bs58.encode(spendPub),
      metaViewPubB58: bs58.encode(viewPub),
    };
  }

  /**
   * Generate deterministic meta keys from a seed (e.g., wallet signature)
   * Same seed will ALWAYS produce the same keys
   * Uses domain separation and context-specific derivation for security
   *
   * @param seed - Seed string (signature from main wallet)
   * @returns Meta keys with spend and view keypairs
   */
  generateDeterministicMetaKeys(seed: string): MetaKeys {
    const seedBytes = this.toBytes(seed);
    // Use domain separator as salt for additional security
    const domainSalt = this.toBytes(APTOS_DOMAIN);

    // Derive two independent 32-byte keys using HKDF with specific contexts
    // HKDF(hash, ikm, salt, info, length)
    const metaSpendPriv = hkdf(
      sha256,
      seedBytes,
      domainSalt,
      SPEND_CONTEXT,
      32
    );
    const metaViewPriv = hkdf(sha256, seedBytes, domainSalt, VIEW_CONTEXT, 32);

    // Ensure keys are valid secp256k1 private keys (< curve order)
    const spendScalar = secp.utils.mod(
      BigInt("0x" + Buffer.from(metaSpendPriv).toString("hex")),
      secp.CURVE.n
    );
    const viewScalar = secp.utils.mod(
      BigInt("0x" + Buffer.from(metaViewPriv).toString("hex")),
      secp.CURVE.n
    );

    const spendPrivFinal = Uint8Array.from(
      Buffer.from(spendScalar.toString(16).padStart(64, "0"), "hex")
    );
    const viewPrivFinal = Uint8Array.from(
      Buffer.from(viewScalar.toString(16).padStart(64, "0"), "hex")
    );

    const spendPub = secp.getPublicKey(spendPrivFinal, true);
    const viewPub = secp.getPublicKey(viewPrivFinal, true);

    return {
      metaSpend: { privateKey: spendPrivFinal, publicKey: spendPub },
      metaView: { privateKey: viewPrivFinal, publicKey: viewPub },
      metaSpendPubB58: bs58.encode(spendPub),
      metaViewPubB58: bs58.encode(viewPub),
      seed, // Include seed for reference
    };
  }

  generateEphemeralKey(): EphemeralKey {
    const priv = secp.utils.randomPrivateKey();
    const pub = secp.getPublicKey(priv, true);
    return { privateKey: priv, publicKeyB58: bs58.encode(pub) };
  }

  generateEphemeralPrivateKey(): Uint8Array {
    return secp.utils.randomPrivateKey();
  }

  async getPublicKeyFromPrivateKey(
    privateKey: Uint8Array | string
  ): Promise<string> {
    const privKey = this.to32u8(privateKey);
    const pub = secp.getPublicKey(privKey, true);
    return bs58.encode(pub);
  }

  validateStealthMatch(payerAddress: string, receiverAddress: string): boolean {
    return payerAddress.toLowerCase() === receiverAddress.toLowerCase();
  }

  // ────────────────────────────────────────────────────────────────
  // Static convenience methods
  // ────────────────────────────────────────────────────────────────
  static to32u8(raw: any): Uint8Array {
    return new PivyStealthAptos().to32u8(raw);
  }
  static pad32(u8: Uint8Array): Uint8Array {
    return new PivyStealthAptos().pad32(u8);
  }
  static toBytes(s: string): Uint8Array {
    return new PivyStealthAptos().toBytes(s);
  }
  static secp256k1PointToAptosAddress(point: Uint8Array): string {
    return new PivyStealthAptos().secp256k1PointToAptosAddress(point);
  }
  static async deriveStealthPub(
    ...args: Parameters<PivyStealthAptos["deriveStealthPub"]>
  ) {
    return new PivyStealthAptos().deriveStealthPub(...args);
  }
  static async deriveStealthKeypair(
    ...args: Parameters<PivyStealthAptos["deriveStealthKeypair"]>
  ) {
    return new PivyStealthAptos().deriveStealthKeypair(...args);
  }
  static async encryptNote(
    ...args: Parameters<PivyStealthAptos["encryptNote"]>
  ) {
    return new PivyStealthAptos().encryptNote(...args);
  }
  static async decryptNote(
    ...args: Parameters<PivyStealthAptos["decryptNote"]>
  ) {
    return new PivyStealthAptos().decryptNote(...args);
  }
  static async encryptEphemeralPrivKey(
    ...args: Parameters<PivyStealthAptos["encryptEphemeralPrivKey"]>
  ) {
    return new PivyStealthAptos().encryptEphemeralPrivKey(...args);
  }
  static async decryptEphemeralPrivKey(
    ...args: Parameters<PivyStealthAptos["decryptEphemeralPrivKey"]>
  ) {
    return new PivyStealthAptos().decryptEphemeralPrivKey(...args);
  }
  static generateMetaKeys(): MetaKeys {
    return new PivyStealthAptos().generateMetaKeys();
  }
  static generateDeterministicMetaKeys(seed: string): MetaKeys {
    return new PivyStealthAptos().generateDeterministicMetaKeys(seed);
  }
  static generateEphemeralKey(): EphemeralKey {
    return new PivyStealthAptos().generateEphemeralKey();
  }
  static validateStealthMatch(a: string, b: string): boolean {
    return new PivyStealthAptos().validateStealthMatch(a, b);
  }
}

export default PivyStealthAptos;

// An optional lock that asks for Face ID, Touch ID, a fingerprint or the
// device PIN when Munim is opened. It uses the device's own authenticator
// through WebAuthn and is checked on this device only: it keeps someone who
// picks up an unlocked phone out, while the account itself is still protected
// by the password and session.

const KEY = "munim-app-lock";
const toBase64 = (buffer) => btoa(String.fromCharCode(...new Uint8Array(buffer)));
const fromBase64 = (text) => Uint8Array.from(atob(text), (char) => char.charCodeAt(0));
const random = (size) => crypto.getRandomValues(new Uint8Array(size));

export const lockCredential = () => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};

export const canUseAppLock = async () => {
  try {
    return !!window.PublicKeyCredential && (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable());
  } catch {
    return false;
  }
};

export const enableAppLock = async (user) => {
  const credential = await navigator.credentials.create({
    publicKey: {
      challenge: random(32),
      rp: { name: "Munim.AI" },
      user: { id: random(16), name: user.email, displayName: `${user.firstName} ${user.lastName || ""}`.trim() },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "discouraged" },
      timeout: 60000,
    },
  });
  localStorage.setItem(KEY, toBase64(credential.rawId));
};

export const disableAppLock = () => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing stored
  }
};

export const unlockApp = async () => {
  const id = lockCredential();
  if (!id) return true;
  await navigator.credentials.get({
    publicKey: {
      challenge: random(32),
      allowCredentials: [{ type: "public-key", id: fromBase64(id) }],
      userVerification: "required",
      timeout: 60000,
    },
  });
  return true;
};

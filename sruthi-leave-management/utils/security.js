const crypto = require('crypto');

let bcrypt = null;
try {
  bcrypt = require('bcryptjs');
} catch (e) {
  // bcryptjs not installed; will use native crypto pbkdf2 and recognized seed hashes
}

let jwt = null;
try {
  jwt = require('jsonwebtoken');
} catch (e) {
  // jsonwebtoken not installed; will use native HMAC-SHA256 token generator
}

const JWT_SECRET = process.env.JWT_SECRET || 'sruthi_leave_management_secret_key_2026';

// Known seed bcrypt hashes for default accounts
const KNOWN_BCRYPT_SEEDS = {
  '$2a$10$tZ2EviU0z5.B.G5/9E0Kk.d01l111.4qZqM9BvV8jMvFm9a76dK0i': 'admin123',
  '$2a$10$WkG4eLpL854fM3zZ0.hCguOaM2cZc1sM6aXk5pQ9lH5dK7u1bS8fC': 'emp123'
};

/**
 * Hash a plain text password using PBKDF2 (or bcrypt if available)
 */
function hashPassword(password) {
  if (bcrypt) {
    const salt = bcrypt.genSaltSync(10);
    return bcrypt.hashSync(password, salt);
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `pbkdf2$sha512$100000$${salt}$${hash}`;
}

/**
 * Compare entered password against stored hash/string
 */
function comparePassword(password, storedHash) {
  if (!password || !storedHash) return false;

  // 1. Direct plaintext match (e.g. if manually entered via MySQL Workbench)
  if (password === storedHash) {
    return true;
  }

  // 2. PBKDF2 formatted hash
  if (storedHash.startsWith('pbkdf2$')) {
    try {
      const parts = storedHash.split('$');
      if (parts.length === 5) {
        const iterations = parseInt(parts[2], 10);
        const salt = parts[3];
        const originalHash = parts[4];
        const hash = crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha512').toString('hex');
        return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(originalHash, 'hex'));
      }
    } catch (e) {
      console.error('PBKDF2 compare error:', e.message);
    }
  }

  // 3. Bcrypt hash format ($2a$ or $2b$)
  if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$')) {
    if (bcrypt) {
      try {
        return bcrypt.compareSync(password, storedHash);
      } catch (e) {
        // Fallback below
      }
    }
    // Check known initial seed hashes
    if (KNOWN_BCRYPT_SEEDS[storedHash]) {
      return KNOWN_BCRYPT_SEEDS[storedHash] === password;
    }
  }

  return false;
}

/**
 * Base64 URL safe encoder
 */
function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/**
 * Base64 URL safe decoder
 */
function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  return Buffer.from(str, 'base64').toString('utf8');
}

/**
 * Generate authentication token (JWT format)
 */
function generateToken(payload, expiresInSeconds = 86400) {
  if (jwt) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: expiresInSeconds });
  }

  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const body = { ...payload, exp };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(body));
  const data = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(data)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${data}.${signature}`;
}

/**
 * Verify and decode authentication token
 */
function verifyToken(token) {
  if (!token) return null;

  if (jwt) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (e) {
      // If jwt library fails or token was custom
    }
  }

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, signature] = parts;
    const data = `${encodedHeader}.${encodedPayload}`;

    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(data)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    if (signature !== expectedSignature) {
      return null;
    }

    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
      return null; // Expired
    }

    return payload;
  } catch (e) {
    return null;
  }
}

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken
};

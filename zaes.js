const crypto = require('crypto');

class ZeroAES {
    constructor(key, iv) {
        this.key = Buffer.from(key, 'utf-8');
        this.iv = Buffer.from(iv, 'utf-8');
    }

    encrypt(text) {
        let cipher = crypto.createCipheriv('aes-256-cfb', this.key, this.iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return encrypted;
    }

    decrypt(text) {
        text = text.toString();
        let decipher = crypto.createDecipheriv('aes-256-cfb', this.key, this.iv);
        let decrypted = decipher.update(text, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
}
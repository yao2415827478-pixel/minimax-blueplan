const crypto = require('crypto');

// 测试私钥格式
const privateKeyBase64 = 'MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC0SeW+o+9U9veDRblJ2hTSF9mgzIwD9X0cTzC5nU7d5Y7jgeG5vBeOqVkHtc29GsBM4N4+ZSjrXQ/5CnOb+2ZRae8iYuHcY5CwN6Hy3piuZIFdIxP5kdxMoKurLzcMHT7IKyhTZ0ot2LbX853EclShmufeIBVoNlz7osU50TwzsR4dG6im7k0gxtEobxJFwd3jg0m7m+fCsgDWUGQ0T7cwfKg2tpCt2qAe3bXcZXExrN9cD0xcVf4j4YHi81o5G4idud+LaVJM5rMraRWWT4Kodw0JL97QqnLGgG5d5xLY3ZafoFCYJ3n0o42Z/IMquO5zOo5x4EYguXCl0haQ1tq/AgMBAAECggEBAKeylSFfG5/MmS5iDJfFYtiJlsUbfqGwF0/d2VTOHi4I+YBlr7E0ZDUvEME7OsRLvdPE1vTy470KM3FTZ3YPwny4LNevYqe9dTh0hw+CPkL4+dvIZSwfoOsmCIiSwoFiMqO+gSQTT8yVaH42/Old75rinArhjQgCiTsHjKzbE0SAS5RyCInVxwFLp5MxySlwTiVAzpyDuNO2P+sAqUYoD5EJ8MLdLjin0BMrn100XIVr/xV3rTJHVs3ND73uiTlyzcQvuqed6tgryX+k4qB3RHxE/+jGFzSPelCZURI+XGOUjpgMTmX6K8eSitvASRR1yPM2fIqHPbpgcjqvNlxbAgECgYEA4IBTAe0Y/AkkZSQjW5UDHuMSc43/9EJN+R4ktRawExSUjPwsdwqWUtWH7FSzNrnU0NGWrQ3+pfH5wvZlkf1CxSvXe6n4pvceJ41fYe5zwi1LNIHtzXa7EP+FthC+1wP3NbodEU4Ww/ilTwbMmQzDF3ucyzqg7UkARI9ioaJJFpkCgYEAzZWJgPtI8zIp+jL0YT4kxz4xujzaFLrrIyDaTAvyVHLhPslUizv3zRsgFyqexOiwqeG5hKgF3sIVCxK51G3anVFfxkkUrHOn4hyzaxD4wgL+K+wnmCj91TZM9JdFmikWRuhbLIiEeYEsh3wpLNGAQ+oLwZlU0E1zX9h6ifs/SxcCgYB4v2xl/9FNVdl2cM53ppkMFtPIxRpilPr9P2I86BwB1zLi9Ysw58fce67kxNWzXJYDToc9Quaw+In+e6o7sD0mcaMvh0cO/qEAYwBnWup2CQiHEE8IEJEi3lxbhXwvh5mCEz0pHpgOBYFcFOscconH6pt1j24Y0gfL2FcTWob3GQKBgQCCANUSNlV8TLWU3VICiEyznhXOIpr5zvXQof7JZiiY1IixrpkC7yoVjtitLat283p8AxzQ0Xvc0LiD5xSSS+GZ6BJ7jk0/fGemqeWfh/z2mvPmDJFBPHK/uHXTmjFOejr3HgpB0BaNy2zARHi5OcY1rDRA+dhTXRbffkKHLNVqgwKBgCAKMH2zokYQFANzquFElhKnjK5HuExNvhns2+WAVkOQjicobje6MowSB8wEeFPS0d1YS0r3Z5FLxqINE06bTV8ipDzmjHzHHZGcR4kDDKt994zfgjWQRcTWLkJjrAbYMs6BHrqdGw0ze18B5WZfatdVhDZWJq3ZHJfcAlQ/599f';

// 格式化私钥
function formatPrivateKey(key) {
  const cleanKey = key.replace(/\s/g, '');
  const chunks = [];
  for (let i = 0; i < cleanKey.length; i += 64) {
    chunks.push(cleanKey.substring(i, i + 64));
  }
  return '-----BEGIN PRIVATE KEY-----\n' + chunks.join('\n') + '\n-----END PRIVATE KEY-----';
}

const pemKey = formatPrivateKey(privateKeyBase64);
console.log('私钥PEM格式:');
console.log(pemKey);
console.log('\n测试签名...');

try {
  const sign = crypto.createSign('RSA-SHA256');
  sign.update('test=123', 'utf8');
  const signature = sign.sign(pemKey, 'base64');
  console.log('签名成功:', signature.substring(0, 50) + '...');
} catch (e) {
  console.error('签名失败:', e.message);
}

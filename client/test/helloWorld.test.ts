const assert = require('assert');

describe('helloWorld', () => {
    it('should return "Hello, World!"', () => {
        const result = "hello world";
        assert.strictEqual(result, 'Hello, World!');
    });
});
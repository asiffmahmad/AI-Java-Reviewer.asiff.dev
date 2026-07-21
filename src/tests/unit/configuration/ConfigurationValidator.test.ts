import * as assert from 'assert';
import { ConfigurationValidator } from '../../../configuration/ConfigurationValidator';

describe('ConfigurationValidator', () => {
  const validator = new ConfigurationValidator();

  it('should pass for valid empty object (defaults apply)', () => {
    assert.doesNotThrow(() => validator.validate({}));
  });

  it('should pass for valid partial object', () => {
    assert.doesNotThrow(() => validator.validate({
      provider: 'openai',
      javaVersion: '17',
      framework: 'spring-boot'
    }));
  });

  it('should throw for non-object', () => {
    assert.throws(() => validator.validate([]), /Configuration must be an object/);
    assert.throws(() => validator.validate('string'), /Configuration must be an object/);
    assert.throws(() => validator.validate(null), /Configuration must be an object/);
  });

  it('should throw for invalid provider', () => {
    assert.throws(() => validator.validate({ provider: 'invalid-provider' }), /Invalid aiProvider/);
  });

  it('should throw for invalid rules type', () => {
    assert.throws(() => validator.validate({ rules: 'not-an-array' }), /rules must be an array of strings/);
    assert.throws(() => validator.validate({ rules: [123] }), /rules\[0\] must be a string/);
  });

  it('should throw for invalid ruleOverrides', () => {
    assert.throws(() => validator.validate({ ruleOverrides: {} }), /ruleOverrides must be an array/);
    assert.throws(() => validator.validate({ ruleOverrides: [null] }), /ruleOverrides\[0\] must be an object/);
    assert.throws(() => validator.validate({ ruleOverrides: [{}] }), /ruleOverrides\[0\].id must be a string/);
  });
});

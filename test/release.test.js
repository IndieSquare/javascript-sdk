var IndieSquare = require('../lib/index');

var assert = require('assert');
var indiesquare = new IndieSquare();
var is_use_server = new IndieSquare({'apikey': 'abcdefg012345', 'use_server': true});
var is_use_server_port = new IndieSquare({'apikey': 'abcdefg012345', 'use_server': true, 'port': 8081});

describe('Endpoint', () => {
  it('check base endpoint', () => {
    assert.equal(indiesquare.getBaseUrl(), 'https://indiesquare.me');
  });
  
  it('check base endpoint with use_server', () => {
    assert.equal(is_use_server.getBaseApiUrl(), 'http://localhost:8080');
  });
  
  it('check base endpoint with use_server, port', () => {
    assert.equal(is_use_server_port.getBaseApiUrl(), 'http://localhost:8081');
  });
  
  it('check base api endpoint', () => {
    assert.equal(indiesquare.getBaseApiUrl(), 'https://api.indiesquare.me');
  });
});

describe('path to ApiKey', () => {
  it('check empty Api Key', () => {
    assert.equal(indiesquare.getApiKey(), null);
  });
  
  it('check specific Api Key: abcdefg012345', () => {
    assert.equal(is_use_server.getApiKey(), 'abcdefg012345');
  });
});

describe('PubSub', () => {
  it('check empty Api Key', (done) => {
    assert.equal(indiesquare.getAddress('test', function(url, a, err){if(!err && url != null){ done(); }}, null), null);
  });
});
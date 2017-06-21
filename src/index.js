import 'whatwg-fetch';
import MobileDetect from 'mobile-detect';

class IndieSquare {
	constructor( parent_params ){
		this.base = 'https://indiesquare.me';
		this.baseApi = 'https://api.indiesquare.me';
		this.apikey = null;
		
		if( parent_params ){
			if( parent_params.apikey != null ){
				this.apikey = parent_params.apikey;
			}
			if( parent_params.use_server && parent_params.use_server !== false ){
				try{ this.baseApi = window.location.protocol + '//' + window.location.hostname; }
				catch(e){ this.baseApi = 'http://localhost'; }
				
				if( parent_params.port ){
					this.baseApi += ':' + parent_params.port;
				}
				else{
					this.baseApi += ':8080';
				}
			}
		}
	}
	
	getBaseUrl(){
		return this.base;
	}
	
	getBaseApiUrl(){
		return this.baseApi;
	}
	
	getApiKey(){
		return this.apikey;
	}
	
	_getscheme() {
		var scheme = null;
		try{
		    var userAgent = window.navigator.userAgent.toLowerCase();
			if( userAgent.indexOf('indiesquarewallet') != -1 ) scheme = 'indiesquarewallet';
			else if( userAgent.indexOf('msie') != -1 ) scheme = null;
			else if( userAgent.indexOf('crios') != -1 ) scheme = 'googlechrome';
			else if( userAgent.indexOf('safari') != -1 ) scheme = 'http';
			else if( userAgent.indexOf('opera') != -1 ) scheme = 'opera-http';
			else if (userAgent.indexOf('android') != -1) scheme = 'http';
		}
		catch(e){
			scheme = 'http';
		}
		return scheme;
	};
	
	_uuid() {
		var u = 'xxxxxxxx-xxxx'.replace(/[xy]/g, function(c) {
		var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
			return v.toString(16);
		});
		return u;
	}
	
	_linkageWallet(params, channel, connect){
		var _params = { channel: channel, nonce: this._uuid() };
		var _scheme = this._getscheme();
	    if( _scheme === 'indiesquarewallet' && params.request == 'sign' ) _params['unsigned_hex'] = params.unsigned_hex;
		
		if( params.request === 'screen_to' ){
			Object.assign(_params, params);
			delete _params['channel'];
			delete _params['request'];
		}
		var url_params = params.request + '?params=' + JSON.stringify(_params);
		if( params.request === 'verifyuser' || params.request === 'getaddress' ){
			var xcallback_params = '';
			
			_params['x-success'] = params['x-success'];
			_params['msg'] = channel;
			for( var key in _params ){
				xcallback_params += key + '=' + _params[key] + '&';
			}
			url_params = 'x-callback-url/' + params.request + '?' + xcallback_params.slice(0, -1);
		}
		var url = 'indiewallet://' + url_params;
		
		var urlScheme = null;
		var md = null;
		try{
		    md = new MobileDetect(window.navigator.userAgent);
		    if (md.mobile()) {
		      if (md.os() === 'iOS') {
		        urlScheme = url;
		      } else {
		        urlScheme = 'intent://#Intent;scheme=indiewallet;package=inc.lireneosoft.counterparty;S.source=' + url_params + ';end';
		      }
		    }
	    }
	    catch(e){}
	    
	    if( _scheme === 'indiesquarewallet' ){
			weblink = function(){
				weblink = null;
				return url;
			};
		}
	    else {
			if( md && md.mobile() ) document.location = url;
			var time = (new Date()).getTime();
	        setTimeout(function(){
	            if( ((new Date()).getTime() - time) < 400 ){
	                connect(url, urlScheme, null);
	            }
	        }, 300);
	    }
    }
    
    _checkStatus(response) {
		if( response.status >= 200 && response.status < 300 ){
			return response;
		}
		else {
			var error = new Error();
			error.response = response;
			throw error;
		}
	}
    
    _pubsub(channel, params, connect, callback){
	    var self = this;
	    fetch(this.base + '/pubsub/topic', {
			'method': 'POST',
			'headers': { 'Content-Type': 'application/x-www-form-urlencoded' },
			'body': 'channel=' + channel
		})
		.then(this._checkStatus)
		.then(function(result) {
			self._linkageWallet(params, channel, connect);
			
			fetch(self.base + '/pubsub/subscribe', {
				'method': 'POST',
				'headers': { 'Content-Type': 'application/x-www-form-urlencoded' },
				'body': 'channel=' + channel + '&type=1',
				'timeout': 1800
			})
			.then(self._checkStatus)
			.then(function(response) {
				return response.json();
			})
			.then(function(data) {
				if( data.failed ){
					callback(null, data);
					return;
			    }
			    callback(data, null);
			})
			.catch(function(error) {
				callback(null, error);
			});
		})
		.catch(function(error) {
			connect(null, null, error);
		});
	}
	
	_requestJSON( url, callback ){
		fetch(url)
		.then(function(response) {
			return response.json()
		}).then(function(json) {
			callback(json, null);
		}).catch(function(error) {
			callback(null, error);
		});
	}
	
	_requestApi( method, url, params, callback ){
		var headers = { 'Content-Type': 'application/json; charset=utf-8' }
		if( this.apikey != null ) headers['X-Api-Key'] = this.apikey;
		if( !new RegExp('^(https?:\\/\\/)').test(url) ) url = 'https://' + url;
		
		fetch(url, {
			'method': method,
			'headers': headers,
			'body': (method === 'GET')? null: JSON.stringify(params)
		})
		.then(function(response) {
			if( response.status >= 200 && response.status < 300 ){
				return response.json();
			}
			else{
				return response.json().then(function(data){
					var error = new Error();
					error.data = data;
					throw error;
				});
			}
		})
		.then(function(data) {
			callback(data, null);
		})
		.catch(function(error) {
			callback(null, error.data);
		});
	}
	
	signTransaction(params, connect, callback) {
		var channel = 'indie-' + this._uuid();
	  
		this._pubsub(channel, {'request': 'sign', 'unsigned_hex': params.unsigned_tx}, connect, function( result, error ){
			if( error ){
				callback(null, error);
				return;
			}
			callback(result.data, null);
		});
		
		var self = this;
		
		if( this._getscheme() !== 'indiesquarewallet' ){
			var receiveChannel = channel + 'receive';
			fetch(this.base + '/pubsub/topic', {
				'method': 'POST',
				'headers': { 'Content-Type': 'application/x-www-form-urlencoded' },
				'body': 'channel=' + receiveChannel
			})
			.then(this._checkStatus)
			.then(function(data) {
				fetch(self.base + '/pubsub/publish', {
					'method': 'POST',
					'headers': { 'Content-Type': 'application/x-www-form-urlencoded' },
					'body': 'channel=' + receiveChannel + '&data=' + JSON.stringify({ 'unsigned_hex': params.unsigned_tx })
				})
				.then(self._checkStatus)
				.then(function(response) {
					return response.json();
				})
				.then(function(data) {
					if( data.failed ){
						callback(null, data);
						return;
				    }
				})
				.catch(function(error) {
					callback(null, error);
				});
			})
			.catch(function(error) {
				connect(null, null, error);
			});
		}
	}
	
	getAddress(xsuccess, connect, callback) {
		var channel = 'indie-' + this._uuid();
		this._pubsub(channel, {'request': 'getaddress', 'x-success': xsuccess}, connect, function( result, error ){
			if( error ){
				callback(null, error);
				return;
			}
			callback(result.data, null);
		});
	}
	
	transition(params, callback) {
		params.request = 'screen_to';
		this._linkageWallet(params, null, callback);
	}
	
	createSend(params, callback) {
		this._requestApi( 'POST', this.baseApi + '/v2/transactions/send', params, callback );
	}
	
	createIssuance(params, callback) {
		this._requestApi( 'POST', this.baseApi + '/v2/transactions/issuance', params, callback );
	}
	
	createOrder(params, callback) {
		this._requestApi( 'POST', this.baseApi + '/v2/transactions/order', params, callback );
	}
	
	createCancel(params, callback) {
		this._requestApi( 'POST', this.baseApi + '/v2/transactions/cancel', params, callback );
	}
	
	broadcast(params, callback) {
		this._requestApi( 'POST', this.baseApi + '/v2/transactions/broadcast', params, callback );
	}
	
	unpackTransaction(params, callback) {
		this._requestApi( 'POST', this.baseApi + '/v2/transactions/unpack', params, callback );
	}
	
	getBalances(params, callback) {
		this._requestApi( 'GET', this.baseApi + '/v2/addresses/' + params.source + '/balances', params, callback );
	}
	
	getHistory(params, callback) {
		this._requestApi( 'GET', this.baseApi + '/v2/addresses/' + params.source + '/history', params, callback );
	}
	
	getTokenInfo(params, callback) {
		this._requestApi( 'GET', this.baseApi + '/v2/tokens/' + params.token, params, callback );
	}
	
	getTokenHolders(params, callback) {
	  this._requestApi( 'GET', this.baseApi + '/v2/tokens/' + params.token + '/holders', params, callback );
	}
	
	getTokenHistory(params, callback) {
	  this._requestApi( 'GET', this.baseApi + '/v2/tokens/' + params.token + '/history', params, callback );
	}
	
	getTokenDescription(params, callback) {
		var pattern = new RegExp('^(https?:\\/\\/)?((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|((\\d{1,3}\\.){3}\\d{1,3}))(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*(\\?[;&a-z\\d%_.~+=-]*)?(\\#[-a-z\\d_]*)?$','i');
		if( pattern.test(params.description) ){
			this._requestJSON( params.description, callback);
		}
		else{
			callback({'description': params.description, 'website': ''}, null);
		}
	}
	
	callApi(method, endpoint, params, callback) {
		this._requestApi( method, this.baseApi + endpoint.url, params, callback );
	}
}
export default IndieSquare;
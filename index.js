#!/usr/bin/env node
const axios = require("axios");
const Rx = require('rxjs');
const Promise = require("bluebird");
const util = require('util');
const strip = require('./strip');

/**
 * Returns the oauth URL to be called from the browser to trigger the oauth process.
 *
 * @param {Object} [options]
 * @param {String} [options.redirectUri] OAuth redirect URI
 * @param {String} [options.clientId] OAuth client ID
 * @param {String} params additional parameters, such as loginHint, state, etc.
 * @returns {String} The OAuth URL
 */
module.exports.oauth = function (params, options) {
	const scope = 'read_customers,read_orders';
	return 'https://' + params.shop
		+'.myshopify.com/admin/oauth/authorize'
		+ '?client_id='+options.clientId+'&scope=' + scope
		+ '&redirect_uri=' + options.redirectUri;
};

/**
 * Send the authorization code and retrieve a refresh token.
 *
 * @param {String} [params]
 * @param {String} [params.code] Authorization code
 * @param {String} [params.hmac] Shopify signature
 * @param {String} [params.shop] The shop domain
 * @param {Object} [options]
 * @param {String} [options.redirectUri] OAuth redirect URI
 * @param {String} [options.clientId] OAuth client ID
 * @param {String} [options.clientSecret] OAuth client secret
 * @returns {String} The OAuth URL
 */
module.exports.authorize = function (params, options) {
	// TODO Verify hmac, state & shop (see https://help.shopify.com/api/getting-started/authentication/oauth#get-the-client-credentials)
	return new Promise(function (resolve, reject) {
		const shop = params.shop;
		const code = params.code;
		axios.post('https://' + shop + '/admin/oauth/access_token', {
			client_id: options.clientId,
			client_secret: options.clientSecret,
			code: code
		}).then(res => {
			const accessToken = res.data.access_token;
			resolve({
				refreshToken: accessToken,
				accessToken: accessToken,
				expiresOn: null,
				metadata: {
					shop: params.shop
				},
			});
		}).catch(err => {
			reject(normalizeError(err));
		});
	});
};

module.exports.refresh = function (oauthToken) {
	return new Promise(function (resolve, reject) {
		// In shopify, (offline) access tokens are permanent, so no need to refresh it, simply return the so called refresh
		// token as an access token...
		// TODO: optimize this on the Java side, so that if the first access token retrieved never expires, we don't further call refresh
		resolve(oauthToken);
	});
};

function config(oauthToken) {
	return {
		baseURL: "https://" + oauthToken.metadata.shop + "/admin",
		headers: {
			"X-Shopify-Access-Token": oauthToken.accessToken
		}
	};
}

module.exports.account = function (oauthToken) {
	return new Promise(function (resolve, reject) {
		getShop(config(oauthToken)).subscribe(res => {
			resolve({
				loginName: res.shop.name,
				accountUrl: 'https://' + res.shop.domain
			});
		}, error => {
			reject(normalizeError(error));
		});
	});
};

module.exports.fetch = function (oauthToken, email) {
	return new Promise(function (resolve, reject) {
		// store.myshopify.com/admin/customers/search.json?query=email:name@domain.com&fields=email,id
		const config = config(oauthToken);
		Rx.Observable.forkJoin(
			getShop(config),
			searchCustomer(config, email)
		).subscribe(res => {
			const shop = res[0].shop;
			const customers = res[1].customers;
			var customer;
			if (customers && customers.length > 0) {
				customer = customers[0];
				if (customer.last_order_id) {
					getOrder(config, customer.last_order_id).subscribe(res => {
						const orders = res.orders;
						if (orders && orders.length > 0) {
							const order = orders[0];
							resolve(strip(shop, customer, order));
						} else {
							resolve(strip(shop, customer));
						}
					}, error => {
						reject(normalizeError(error));
					});
				} else {
					resolve(strip(shop, customer));
				}
			} else {
				resolve(strip(shop));
			}
		}, error => {
			reject(normalizeError(error));
		});
	});

};

/**
 * @param internalError
 * @return Error
 */
function normalizeError(internalError) {
	var error = new Error();
	if (typeof internalError === 'string') {
		error.message = internalError;
	} else { // if (internalError instanceof Error)
		if (internalError.message) {
			error.message = internalError.message;
		} else {
			error.message = 'No Error message';
		}
		if (internalError.response) {
			var response = internalError.response;
			if (response.status) {
				error.status = response.status;
			}
			if (response.statusText) {
				error.statusText = response.statusText;
			}
			if (response.data) {
				var data = response.data;
				if (data.Code && data.Message) {
					error.cause = {
						error: data.Code,
						error_description: data.Message
					}
				} else if (data.error && data.error_description) {
					error.cause = {
						error: data.error,
						error_description: data.error_description
					};
				} else {
					error.cause = {
						error: 'unknown',
						error_description: util.inspect(data)
					}
				}
			}
		}
	}
	return error;
}

function getShop(config) {
	return Rx.Observable.fromPromise(axios.get('/shop.json', config)).map(res => res.data);
}

function searchCustomer(config, email) {
	return Rx.Observable.fromPromise(axios.get('/customers/search.json?query=email:' + email, config)).map(res => res.data);
}

/**
 * Get Order by ID.
 * See https://help.shopify.com/api/reference/order
 */
function getOrder(config, id) {
	return Rx.Observable.fromPromise(axios.get('/orders.json?ids=' + id, config)).map(res => res.data);
}


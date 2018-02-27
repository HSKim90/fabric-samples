// declare strict mode
'use strict';

/*
* Copyright IBM Corp All Rights Reserved
*
* SPDX-License-Identifier: Apache-2.0
*/
/*
 * Enroll the admin user
 */

// get modules
// npm을 통해 설치한 외부 패키지는 패스를 명시하지 않아도 require로 가져올 수 있다.
// require 함수의 인자로 디렉토리를 설정할 때 모듈을 명시하지 않고 require 함수를 호출하면 해당 디렉터리의 index.js을 로드한다.
var Fabric_Client = require('fabric-client');
var Fabric_CA_Client = require('fabric-ca-client');

// Node.js는 기본으로 포함하고 있는 모듈이 있다. 이를 코어 모듈이라 한다. 코어 모듈을 로딩할 때에는 패스를 명시하지 않아도 무방하다.
var path = require('path');
var util = require('util');
var os = require('os');

//
var fabric_client = new Fabric_Client();
var fabric_ca_client = null;
var admin_user = null;
var member_user = null;
var store_path = path.join(__dirname, 'hfc-key-store');
console.log(' Store path:'+store_path);


Fabric_Client.newDefaultKeyValueStore({ path: store_path
}).then((state_store) => { // .then(function (state_store)){
    // assign the store to the fabric client
    fabric_client.setStateStore(state_store);
    var crypto_suite = Fabric_Client.newCryptoSuite();
    // use the same location for the state store (where the users' certificate are kept)
    // and the crypto store (where the users' keys are kept)
    var crypto_store = Fabric_Client.newCryptoKeyStore({path: store_path});
    crypto_suite.setCryptoKeyStore(crypto_store);
    fabric_client.setCryptoSuite(crypto_suite);

    var	tlsOptions = {
    	trustedRoots: [],
    	verify: false
    };
    // be sure to change the http to https when the CA is running TLS enabled
    fabric_ca_client = new Fabric_CA_Client('http://localhost:7054', tlsOptions , 'ca.example.com', crypto_suite);

    // first check to see if the admin is already enrolled
    return fabric_client.getUserContext('admin', true); // #1
}).then((user_from_store) => { // .then(function (user_from_store)){
    if (user_from_store && user_from_store.isEnrolled()) {
        console.log('Successfully loaded admin from persistence');
        admin_user = user_from_store;
        return null;
    } else {
        // need to enroll it with CA server
        return fabric_ca_client.enroll({ // #2
          enrollmentID: 'admin',
          enrollmentSecret: 'adminpw'
        }).then((enrollment) => {
          console.log('Successfully enrolled admin user "admin"');
          return fabric_client.createUser(
              {username: 'admin',
                  mspid: 'Org1MSP',
                  cryptoContent: { privateKeyPEM: enrollment.key.toBytes(), signedCertPEM: enrollment.certificate }
              });
        }).then((user) => {
          admin_user = user;
          return fabric_client.setUserContext(admin_user); // #3
        }).catch((err) => {
          console.error('Failed to enroll and persist admin. Error: ' + err.stack ? err.stack : err);
          throw new Error('Failed to enroll admin');
        });
    }
}).then(() => {
    console.log('Assigned the admin user to the fabric client ::' + admin_user.toString());
}).catch((err) => {
    console.error('Failed to enroll admin: ' + err);
});

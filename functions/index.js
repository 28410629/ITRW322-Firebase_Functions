const functions = require('firebase-functions');
const admin = require("firebase-admin");
var crypto = require("crypto-js");

admin.initializeApp();

exports.fcmSend = functions.firestore
    .document('conversations/{conversationId}')
    .onUpdate((change, context) => {

        const conversationID = context.params.conversationId;
        const document = change.after.data();

        // get sender details
        admin.firestore().collection('users')
            .doc(`${document.lastsentmessageuser}`)
            .get().then(function(doc) {
                if (doc.exists) {
                    console.log('[  OK!  ] Create notification object, initiated by ', doc.data().displayName, '.');
                    // create the notification
                    let message = 'Media received!';
                    if (document.lastsentmessagetype === 0) {
                        message = crypto.AES.decrypt(document.lastsentmessage.toString(), conversationID.toString()).toString(crypto.enc.Utf8);
                    }
                    let sender = doc.data().displayName;
                    if (document.isgroupchat) {
                        sender = document.name + ' : ' + doc.data().displayName;
                    }
                    const payload = {
                        notification: {
                            title: sender,
                            body: message,
                            icon: doc.data().photoURL
                        }
                    };
                    console.log('[  OK!  ] Send it to group or individual.');
                    // send it to group or individual
                    if (document.isgroupchat) {
                        console.log('[  OK!  ] Get multiple receiver ids.');
                        // multiple receiver ids
                        let receivers = [];
                        document.participants.forEach(x => {
                            if (x !== document.lastsentmessageuser) {
                                receivers.push(x);
                            }
                        });
                        console.log('[  OK!  ] Send toast to group.');
                        // send toast message
                        receivers.forEach(x => {
                            admin.firestore().collection('tokens')
                                .doc(`${x}`)
                                .get()
                                .then(x => {
                                    return admin.messaging().sendToDevice(x.data().token, payload);
                                }).catch(err => {
                                console.log('[  ERR  ] Could not send toast to ', x, ': ', err);
                            });
                        });
                    } else {
                        console.log('[  OK!  ] Get receiver id.');
                        // receiver id
                        let userId = document.participants[0];
                        if (userId === document.lastsentmessageuser) {
                            userId = document.participants[1];
                        }
                        console.log('[  OK!  ] Send toast to individual.');
                        // send toast message
                        admin.firestore().collection('tokens')
                            .doc(`${userId}`)
                            .get()
                            .then(x => {
                                return admin.messaging().sendToDevice(x.data().token, payload);
                            }).catch(err => {
                            console.log('[  ERR  ] Could not send toast: ', err);
                        });
                    }
                }
                return null;
            }).catch(function(error) {
                console.log("[  ERR  ] Stop sending toast, could not get sender document:", error);
            });
});

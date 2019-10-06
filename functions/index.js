/*
 const functions = require('firebase-functions');
 // Create and Deploy Your First Cloud Functions
 // https://firebase.google.com/docs/functions/write-firebase-functions

 exports.helloWorld = functions.https.onRequest((request, response) => {
  response.send("Hello from Firebase!");
 });
*/
const functions = require('firebase-functions');
const admin = require("firebase-admin");

var crypto = require("crypto-js");

admin.initializeApp();

exports.fcmSend = functions.firestore
    .document('conversations/{conversationId}')
    .onUpdate((change, context) => {
        // If we set `/users/marie/incoming_messages/134` to {body: "Hello"} then
        // context.params.userId == "marie";
        // context.params.messageCollectionId == "incoming_messages";
        // context.params.messageId == "134";
        // ... and ...
        // change.after.data() == {body: "Hello"}

  // create the notification
        const conversationID = context.params.conversationId;
        const document = change.after.data();
  let payload;
  if (document.lastsentmessagetype === 1) {
      payload = {
          notification: {
              title: document.lastsentmessageuser,
              body: crypto.AES.decrypt(document.lastsentmessage.toString(), conversationID.toString()).toString(crypto.enc.Utf8),
              icon: "https://placeimg.com/250/250/people"
          }
      };
  } else {
      payload = {
          notification: {
              title: document.lastsentmessageuser,
              body: crypto.AES.decrypt(document.lastsentmessage.toString(), conversationID.toString()).toString(crypto.enc.Utf8),
              icon: "https://placeimg.com/250/250/people"
          }
      };
  }

  // send it to group or individual
    if (document.isgroupchat) {
        // admin.database()
        //     .ref(`/fcmTokens/${userId}`)
        //     .once('value')
        //     .then(token => token.val() )
        //     .then(userFcmToken => {
        //         return admin.messaging().sendToDevice(userFcmToken, payload)
        //     })
        //     .catch(err => {
        //         console.log(err);
        //     });
    } else {
        let userId= '';

        document.participants.forEach(x => {
           if(document.lastsentmessageuser !== x) {
              userId = x;
           }
        });

        if (userId !== '') {
            admin.firestore().collection('tokens')
                .doc(`${userId}`)
                .get()
                .then(x => {
                    return admin.messaging().sendToDevice(x.data().token, payload);
                }).catch(err => {
                    console.log(err);
            });
        } else {
            console.log('Could not retrieve user id for direct conversation.');
        }
    }
});

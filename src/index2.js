import "./style.scss";
import "ol/ol.css"
import OMIIcon from "./O-MI.svg"

import {Map as OlMap, View} from "ol";
import OSM from "ol/source/OSM"
import {Tile as TileLayer, Vector as VectorLayer} from "ol/layer";
import {fromLonLat, toLonLat} from "ol/proj";
import VectorSource from "ol/source/Vector";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";

import {open, write, close} from "./omi";
import Circle from "ol/geom/Circle";
import * as AmazonCognitoIdentity from "amazon-cognito-identity-js";
import Select from "ol/interaction/Select";
import {pointerMove} from "ol/events/condition";


//const omiNode = "ws://35.157.16.134:8080";
const omiNode = "wss://azyxvmiy8f.execute-api.eu-central-1.amazonaws.com/prod";
//const omiNodes = ["wss://azyxvmiy8f.execute-api.eu-central-1.amazonaws.com/prod",
 //   "ws://veivi.parkkis.com:8080/"
//];

const backend = "https://vqe2g3hycb.execute-api.eu-central-1.amazonaws.com/prod/parkingfacilities"


const userData = createUserPool();

let accessToken = null;
let idToken = null;
let olMap;

function main() {
    const mainElement = document.querySelector('main');
    const statusElem = document.getElementById('status');
    const addParkingFacilityButton = document.getElementById('add-parking-facility');

    addParkingFacilityButton.addEventListener('click', addParkingFacility);


    const icon = new Image;
    icon.src = OMIIcon;
    icon.classList.add('icon');
    mainElement.appendChild(icon);

    let center = fromLonLat([24, 60]);

    const markerSource = new VectorSource();
    const vector = new VectorLayer({
        source: markerSource
    });
    const loadSource = new VectorSource();
    const loadLayer = new VectorLayer({
        source: loadSource
    });

    const centerSource = new VectorSource();
    const centerLayer = new VectorLayer({
        source: centerSource
    });

    const centerPoint = new Point(fromLonLat([24, 60]));
    const centerFeature = new Feature({
        geometry: centerPoint
    })
    centerSource.addFeature(centerFeature)


    const map = new OlMap({
        target: 'map',
        layers: [
            new TileLayer({
                source: new OSM()
            }),
            vector,
            loadLayer,
            centerLayer
        ],
        view: new View({
            center: fromLonLat([0, 0]),
            zoom: 1
        })

    });
    olMap = map;

    // function* locationProvider() {
    //     map.on('moveend', event => {
    //
    //         const map = event.map;
    //         const center = map.getView().getCenter();
    //         const centerCoords = toLonLat(center);
    //
    //
    //     })
    //
    //
    // }

    if ("geolocation" in navigator) {
        getUserLocation().then(userLocation => {
            center = fromLonLat([userLocation.longitude, userLocation.latitude]);
            const view = map.getView();
            view.animate({zoom: 14, center: center});

            open(omiNode).then(omiConnection => {
                    const done = addInProgress("lataa O-mi");
                    const mpu = map.getView().getProjection().getMetersPerUnit();
                    const feature = new Feature({
                        geometry: new Circle(fromLonLat([userLocation.longitude, userLocation.latitude]), 500 / mpu),
                        name: "loading"
                    });
                    loadSource.addFeature(feature);

                    write(userLocation.longitude, userLocation.latitude, 1000).then(reply => {
                        done();
                        const facilities = parseOmiReply(reply);
                        placeFacilitiesToSource(facilities, markerSource);
                        loadSource.removeFeature(feature);

                    });

                    function onMoveEnd(event) {
                        const map = event.map;
                        const center = map.getView().getCenter();
                        const centerCoords = toLonLat(center);

                        const latitudeInputElement = document.getElementById('latitude-input');
                        const longitudeInputElement = document.getElementById('longitude-input');
                        if (longitudeInputElement)
                            latitudeInputElement.value = centerCoords[1] + "";
                        if (longitudeInputElement)
                            longitudeInputElement.value = centerCoords[0] + "";

                        const done = addInProgress("lataa O-mi");
                        const mpu = map.getView().getProjection().getMetersPerUnit();

                        const feature = new Feature({
                            geometry: new Circle(fromLonLat([centerCoords[0], centerCoords[1]]), 150 / mpu),
                            name: "loading"
                        });
                        loadSource.addFeature(feature);
                        write(centerCoords[0], centerCoords[1], 150).then(reply => {
                            done();
                            const facilities = parseOmiReply(reply);
                            placeFacilitiesToSource(facilities, markerSource);
                            loadSource.removeFeature(feature);

                        })
                        centerPoint.setCoordinates(fromLonLat([centerCoords[0], centerCoords[1]]))
                    }

                    map.on('moveend', onMoveEnd)
                }
            );
        })
    }
    const info = document.getElementById('info');

    let selectPointerMove = new Select({
        condition: pointerMove
    });

    map.addInteraction(selectPointerMove);
    selectPointerMove.on('select', function (e) {
        let features = e.target.getFeatures();
        if (features.getLength() > 0) {
            console.log(features)
            let feature = features.getArray()[0]
            info.innerHTML = '<pre>' + JSON.stringify(feature.get('sensor'), null, " ") + '</pre>'
        }

    })


}

main();


const parsedUrl = new URL(window.location.href);

console.log(parsedUrl);
const hash = parsedUrl.hash;

if (hash) {
    const parts = hash.slice(1).split('&');

    let authInfo = parts.reduce((acc, part) => {
        const keyValue = part.split('=');
        const key = keyValue[0];
        const value = keyValue[1];
        acc[key] = value;
        return acc;
    }, {});

    console.log(authInfo);
    accessToken = authInfo.access_token;
    idToken = authInfo.id_token;
} else {
    const loginLink = document.getElementById('login');
    loginLink.innerHTML = `<a href="https://mypark.auth.eu-central-1.amazoncognito.com/login?response_type=token&client_id=5s8ou6hd2k9t0ro0p9uq5hrfnp&redirect_uri=${window.location.href}&scope=openid+profile+aws.cognito.signin.user.admin&state=12121212">login</a>
`
}

function addParkingFacility(event) {

    const parkingFacilityContainer = document.getElementById('parking-facility')

    let html = `
<div id="parking-facility-form">
    <label for="latitude-input">latitude:</label><input id="latitude-input">
    <label for="longitude-input">longitude:</label><input id="longitude-input">
    <label for="owner-input">sähköposti</label><input id="owner-input">
</div>
<div id="parking-spaces">
</div>
<button id="add-parking-space">Lisää paikka</button>
`
    parkingFacilityContainer.innerHTML = html;

    const latitudeInputElement = document.getElementById('latitude-input');
    const longitudeInputElement = document.getElementById('longitude-input');

    const center = olMap.getView().getCenter();
    const centerCoords = toLonLat(center);

    latitudeInputElement.value = centerCoords[1];
    longitudeInputElement.value = centerCoords[0];

    const addParkingSpaceButton = document.getElementById('add-parking-space')

    addParkingSpaceButton.addEventListener('click', addParkingSpaceInput)

}

const parkingSpaces = [];
let fakeUuid = 1;

function addParkingSpaceInput(event) {
    const parkingSpaceContainer = document.getElementById('parking-spaces');
    const id = fakeUuid++ + "";
    const spaceContainer = document.createElement('div');
    spaceContainer.id = id;
    const html = `Paikka ${id}: <label for="${id}-charge">Lataus mahdollisuus</label><input id="${id}-charge" type="checkbox">
    <button id="${id}-remove">Poista</button>`;
    spaceContainer.innerHTML = html;
    parkingSpaceContainer.appendChild(spaceContainer);

    return false;
}

function getUserLocation() {
    return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(function (position) {
            resolve({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            })
        })
    })
}


function nsResolver(prefix) {
    const ns = {
        omi: "http://www.opengroup.org/xsd/omi/1.0/",
        odf: "http://www.opengroup.org/xsd/odf/1.0/",
        mv: "http://www.schema.mobivoc.org/",
        schema: "http://www.schema.org/"
    };
    return ns[prefix] || ns.odf;
}


const allFacilities = new Map();

function parseOmiReply(omiXml) {
    const parser = new DOMParser();
    const facilities = [];
    const omiDom = parser.parseFromString(omiXml, "application/xml");

    if (omiDom.firstElementChild.nodeName === "parsererror") {
        console.log("omi parse error");
        return [];
    }
    const parkingFacilityPath = "//odf:Object[@type='mv:ParkingFacility']";
    const longitudePath = "./odf:Object/odf:InfoItem[@name='longitude']";
    const latitudePath = "./odf:Object/odf:InfoItem[@name='latitude']";

    const facilityNodes = omiDom.evaluate(parkingFacilityPath, omiDom, nsResolver, XPathResult.ANY_TYPE, null);


    let facilityNode = facilityNodes.iterateNext();
    while (facilityNode) {
        let longitudeNodes = omiDom.evaluate(longitudePath, facilityNode, nsResolver, XPathResult.ANY_TYPE, null);
        let latitudeNodes = omiDom.evaluate(latitudePath, facilityNode, nsResolver, XPathResult.ANY_TYPE, null);
        let latitudeNode = latitudeNodes.iterateNext();
        let longitudeNode = longitudeNodes.iterateNext();
        if (!allFacilities.has(facilityNode.children[0].textContent)) {
            const facility = {
                id: facilityNode.children[0].textContent,
                latitude: Number.parseFloat(latitudeNode.textContent),
                longitude: Number.parseFloat(longitudeNode.textContent)
            };
            facilities.push(facility);
            allFacilities.set(facility.id, facility)
        }
        facilityNode = facilityNodes.iterateNext();
    }
    return facilities;
}

function placeFacilitiesToSource(facilities, source) {

    const features = facilities.map(facility => {
            const feature = new Feature({
                geometry: new Point(fromLonLat([facility.longitude, facility.latitude])),
                name: facility.id
            })
            feature.set('sensor', facility)
            return feature
        }
    );

    source.addFeatures(features)
}


const inProgress = new Map();

function addInProgress(text) {
    const key = Symbol();
    inProgress.set(key, text);
    const statusElem = document.getElementById('status');
    statusElem.innerHTML = Array.from(inProgress.values()).reduce((a, text) => `${a}<li>${text}</li>`, '<ul>') + '</ul>';
    return () => {
        inProgress.delete(key);
        statusElem.innerHTML = Array.from(inProgress.values()).reduce((a, text) => `${a}<li>${text}</li>`, '<ul>') + '</ul>'
    }
}


function createUserPool() {
    const poolData = {
        UserPoolId: 'eu-central-1_dOZApsux4', // your user pool id here
        ClientId: '5s8ou6hd2k9t0ro0p9uq5hrfnp' // your app client id here
    };
    const userPool =
        new AmazonCognitoIdentity.CognitoUserPool(poolData);
    const userData = {
        Username: 'testi', // your username here
        Pool: userPool
    };

    return userData
}


function logIn(userData, authenticationData) {

    const authenticationDetails =
        new AmazonCognitoIdentity.AuthenticationDetails(authenticationData);

    const cognitoUser =
        new AmazonCognitoIdentity.CognitoUser(userData);

    cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: function (result) {
            accessToken = result.getAccessToken().getJwtToken();
            console.log(`success ${accessToken}`)

            const login = document.getElementById('login');
            login.classList.add('hidden');
            const parkingFacility = document.getElementById('parking-facility')
            parkingFacility.classList.remove('hidden')

        },

        onFailure: function (err) {
            alert(JSON.stringify(err));
        },
        mfaRequired: function (codeDeliveryDetails) {
            const verificationCode = prompt('Please input verification code', '');
            cognitoUser.sendMFACode(verificationCode, this);
        },
        newPasswordRequired: function (userAttributes, requiredAttributes) {
            // User was signed up by an admin and must provide new
            // password and required attributes, if any, to complete
            // authentication.

            // userAttributes: object, which is the user's current profile. It will list all attributes that are associated with the user.
            // Required attributes according to schema, which don’t have any values yet, will have blank values.
            // requiredAttributes: list of attributes that must be set by the user along with new password to complete the sign-in.


            // Get these details and call
            // newPassword: password that user has given
            // attributesData: object with key as attribute name and value that the user has given.
            console.log(JSON.stringify(userAttributes));
            console.log(JSON.stringify(requiredAttributes))
            cognitoUser.completeNewPasswordChallenge("Testi321!", {}, {
                onSuccess: res => {
                    alert(`auth ok ${res}`);
                },
                onFailure: err => {
                    alert(`auth fail ${res}`)
                }

            })
        }
    });
}


function initLogin() {
//    const loginButton = document.getElementById('login-button');

    const loginForm = document.getElementById("login");
    loginForm.addEventListener("submit", ev => {
        ev.preventDefault();
        const userName = document.getElementById("username-input").value;
        const userPasswd = document.getElementById("userpasswd-input").value;

        const authenticationData = {
            Username: userName,
            Password: userPasswd,
        };
        logIn(userData, authenticationData);
        return false
    })
}

//initLogin();


if (idToken) {
    document.getElementById('login').classList.add('hidden');
    document.getElementById('parking-facility').classList.remove('hidden')
}

function initFacility() {
    const facilityForm = document.getElementById('parking-facility');

    facilityForm.addEventListener("submit", ev => {
        ev.preventDefault();

        const done = addInProgress("Lisää parkki");
        const name = document.getElementById('name-input').value;
        const latitude = document.getElementById('latitude-input').value;
        const longitude = document.getElementById('longitude-input').value;

        const facility = {
            token: idToken,
            name,
            geo: {latitude, longitude},
            parkingSpaces: [
                {
                    heightLimit: 99.0,
                    widthLimit: 2.5,
                    lenghtLimit: 5.0,
                    validFor: 'Car',
                    available: true,
                    id: document.getElementById('space-name-input').value
                }
            ]
        }

        console.log("posting")
        fetch(backend, {
            method: 'POST',
            body: JSON.stringify(facility),
            headers: {
                Authorization: idToken
            }
        }).then(res => {
            if (res.ok) {
                return res.json()
            }
            console.log(JSON.stringify(res))
        }).then(json => {
            console.log(json)
            done();
            const facility = json['body-json'];
            addInProgress(`${facility.name} lisätty, id: ${facility.id}`)
        }).catch(err => {
            console.log(JSON.stringify(err))
        })
    })


}

initFacility();

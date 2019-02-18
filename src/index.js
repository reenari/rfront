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

const omiNode = "ws://35.157.16.134:8080";

function main() {
    const mainElement = document.querySelector('main');
    const statusElem = document.getElementById('status');
    const latitudeInputElement = document.getElementById('latitude-input');
    const longitudeInputElement = document.getElementById('longitude-input');
    const addParkingSpaceButton = document.getElementById('add-parking-space');
    addParkingSpaceButton.addEventListener('click', addParkingSpaceInput);

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

    const map = new OlMap({
        target: 'map',
        layers: [
            new TileLayer({
                source: new OSM()
            }),
            vector,
            loadLayer
        ],
        view: new View({
            center: fromLonLat([0, 0]),
            zoom: 1
        })

    });

    if ("geolocation" in navigator) {
        getUserLocation().then(userLocation => {
            center = fromLonLat([userLocation.longitude, userLocation.latitude]);
            const view = map.getView();
            view.animate({zoom: 14, center: center});

            open(omiNode).then(omiConnection => {
                    const done = addInProgress("lataa O-mi");
                    const mpu = map.getView().getProjection().getMetersPerUnit();
                    const feature = new Feature({
                        geometry: new Circle(fromLonLat([userLocation.longitude, userLocation.latitude]), 1000 / mpu ),
                        name: "loading"
                    });
                    loadSource.addFeature(feature);

                    write(userLocation.longitude, userLocation.latitude, 500).then(reply => {
                        done();
                        const facilities = parseOmiReply(reply);
                        placeFacilitiesToSource(facilities, markerSource);
                        loadSource.removeFeature(feature);

                    });

                    function onMoveEnd(event) {
                        const map = event.map;
                        const center = map.getView().getCenter();
                        const centerCoords = toLonLat(center);
                        latitudeInputElement.value = centerCoords[1] + "";
                        longitudeInputElement.value = centerCoords[0] + "";

                        const done = addInProgress("lataa O-mi");
                        const mpu = map.getView().getProjection().getMetersPerUnit();

                        const feature = new Feature({
                            geometry: new Circle(fromLonLat([centerCoords[0], centerCoords[1]]), 1000 / mpu),
                            name: "loading"
                        });
                        loadSource.addFeature(feature);
                        write(centerCoords[0], centerCoords[1], 500).then(reply => {
                            done();
                            const facilities = parseOmiReply(reply);
                            placeFacilitiesToSource(facilities, markerSource);
                            loadSource.removeFeature(feature);

                        })
                    }

                    map.on('moveend', onMoveEnd)
                }
            );

        })
    }
}
main();

const parkingSpaces = [];
let fakeUuid = 1;
function addParkingSpaceInput(event) {
    const parkingSpaceContainer = document.getElementById('parking-spaces');
    const id = fakeUuid++ + "";
    const spaceContainer = document.createElement('div');
    spaceContainer.id=id;
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
        if(! allFacilities.has(facilityNode.children[0].textContent)) {
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

    const features = facilities.map(facility =>
        new Feature({
            geometry: new Point(fromLonLat([facility.longitude, facility.latitude])),
            name: facility.id
        })
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




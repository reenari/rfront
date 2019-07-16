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
import {click, pointerMove, altKeyOnly} from 'ol/events/condition.js';
import Select from 'ol/interaction/Select.js';

import Circle from "ol/geom/Circle";

const sensorEndpoint = "https://bpqv8bxui2.execute-api.eu-central-1.amazonaws.com/prod"

function main() {
    const mainElement = document.querySelector('main');

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
                console.log(center)
                const view = map.getView();
                //          view.animate({zoom: 14, center: center});

                fetch(sensorEndpoint).then(reply => reply.json()).then(sensorData => {

                    const sensors = sensorData //JSON.parse(data);

                    const features = sensors.map(sensor => {
                            const feature = new Feature({
                                geometry: new Point(fromLonLat([sensor.location.coordinates[0], sensor.location.coordinates[1]])),
                                name: sensor.id
                            })
                            feature.set('sensor', sensor)
                            return feature;
                        }
                    )
                    markerSource.addFeatures(features)

                    center = fromLonLat([sensors[0].location.coordinates[0], sensors[0].location.coordinates[1]])
                    console.log(center)
                    view.animate({zoom: 12, center: center});

                })
            }
        );

    }

    const info = document.getElementById('info');

    let selectPointerMove = new Select({
        condition: pointerMove
    });

    map.addInteraction(selectPointerMove);
    selectPointerMove.on('select', function(e) {
        let features = e.target.getFeatures();
        if(features.getLength() > 0) {
            console.log(features)
            let feature = features.getArray()[0]
            info.innerHTML = '<pre>' + JSON.stringify(feature.get('sensor'),null," ") + '</pre>'
        }

    })

    // map.on("click", function (evt) {
    //     this.forEachFeatureAtPixel(evt.pixel, function (feature, layer) {
    //         const event = evt.pointerEvent;
    //         const x = event.clientX
    //         const y = event.clientY;
    //         info.innerHTML='<pre>' + JSON.stringify(feature.get('sensor'),null," ") + '</pre>';
    //         info.style.top = y + "px";
    //         info.style.left = x + "px";
    //         console.log(feature);
    //     });
    // });
}

main();


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


const data = "[{\"id\":\"373773207E33011C\",\"type\":\"AirQualityObserved\",\"PM10\":0.7,\"PM2.5\":0.2,\"address\":{\"addressCountry\":\"FI\",\"addressLocality\":\"Helsinki\",\"streetAddress\":\"Tallberginkatu 1 C\"},\"dateObserved\":\"2019-03-05T14:45:29.917000+00:00Z\",\"location\":{\"type\":\"Point\",\"coordinates\":[24.90313,60.161827000]},\"reliability\":0.5,\"source\":\"https://fvh.io/ilmanlaatu2019\"},{\"id\":\"373773207E33011B\",\"type\":\"AirQualityObserved\",\"PM10\":1.5,\"PM2.5\":1.3,\"address\":{\"addressCountry\":\"FI\",\"addressLocality\":\"Helsinki\",\"streetAddress\":\"Jousimiehentie 9\"},\"dateObserved\":\"2019-03-05T14:45:48.745000+00:00Z\",\"location\":{\"type\":\"Point\",\"coordinates\":[24.985833,60.275]},\"reliability\":0.5,\"source\":\"https://fvh.io/ilmanlaatu2019\"},{\"id\":\"373773207E330100\",\"type\":\"AirQualityObserved\",\"PM10\":6.3,\"PM2.5\":2.1,\"address\":{\"addressCountry\":\"FI\",\"addressLocality\":\"Helsinki\",\"streetAddress\":\"Itäinen Brahenkatu 13\"},\"dateObserved\":\"2019-03-05T14:45:20.120000+00:00Z\",\"location\":{\"type\":\"Point\",\"coordinates\":[24.949541,60.189692]},\"reliability\":0.5,\"source\":\"https://fvh.io/ilmanlaatu2019\"},{\"id\":\"373773207E330101\",\"type\":\"AirQualityObserved\",\"PM10\":6.7,\"PM2.5\":1.4,\"address\":{\"addressCountry\":\"FI\",\"addressLocality\":\"Hyvinkää\",\"streetAddress\":\"Teerimäenkatu 2-4\"},\"dateObserved\":\"2019-03-05T14:44:59.950000+00:00Z\",\"location\":{\"type\":\"Point\",\"coordinates\":[24.837563,60.629972000]},\"reliability\":0.5,\"source\":\"https://fvh.io/ilmanlaatu2019\"},{\"id\":\"373773207E330103\",\"type\":\"AirQualityObserved\",\"PM10\":3.2,\"PM2.5\":0.9,\"address\":{\"addressCountry\":\"FI\",\"addressLocality\":\"Helsinki\",\"streetAddress\":\"Wallininkuja 2\"},\"dateObserved\":\"2019-03-05T14:45:19.862000+00:00Z\",\"location\":{\"type\":\"Point\",\"coordinates\":[24.945422,60.184518000]},\"reliability\":0.5,\"source\":\"https://fvh.io/ilmanlaatu2019\"},{\"id\":\"373773207E330104\",\"type\":\"AirQualityObserved\",\"PM10\":4.1,\"PM2.5\":1.2,\"address\":{\"addressCountry\":\"FI\",\"addressLocality\":\"Espoo\",\"streetAddress\":\"Sokerilinnantie 1\"},\"dateObserved\":\"2019-03-05T14:45:06.037000+00:00Z\",\"location\":{\"type\":\"Point\",\"coordinates\":[24.812305000,60.215796000]},\"reliability\":0.5,\"source\":\"https://fvh.io/ilmanlaatu2019\"},{\"id\":\"373773207E330106\",\"type\":\"AirQualityObserved\",\"PM10\":3.1,\"PM2.5\":0.9,\"address\":{\"addressCountry\":\"FI\",\"addressLocality\":\"Helsinki\",\"streetAddress\":\"Välimerenkatu 13\"},\"dateObserved\":\"2019-03-05T14:45:09.016000+00:00Z\",\"location\":{\"type\":\"Point\",\"coordinates\":[24.914516500,60.158998700]},\"reliability\":0.5,\"source\":\"https://fvh.io/ilmanlaatu2019\"},{\"id\":\"373773207E330105\",\"type\":\"AirQualityObserved\",\"PM10\":5,\"PM2.5\":1.4,\"address\":{\"addressCountry\":\"FI\",\"addressLocality\":\"Espoo\",\"streetAddress\":\"Sokerilinnantie 1\"},\"dateObserved\":\"2019-03-05T14:45:39.581000+00:00Z\",\"location\":{\"type\":\"Point\",\"coordinates\":[24.812305000,60.215796000]},\"reliability\":0.5,\"source\":\"https://fvh.io/ilmanlaatu2019\"},{\"id\":\"373773207E330109\",\"type\":\"AirQualityObserved\",\"PM10\":3,\"PM2.5\":1.1,\"address\":{\"addressCountry\":\"FI\",\"addressLocality\":\"Vantaa\",\"streetAddress\":\"Malminiitynpolku 3\"},\"dateObserved\":\"2019-03-05T14:45:27+00:00Z\",\"location\":{\"type\":\"Point\",\"coordinates\":[25.0357,60.31319]},\"reliability\":0.5,\"source\":\"https://fvh.io/ilmanlaatu2019\"},{\"id\":\"373773207E330108\",\"type\":\"AirQualityObserved\",\"PM10\":8.2,\"PM2.5\":1.7,\"address\":{\"addressCountry\":\"FI\",\"addressLocality\":\"Hyvinkää\",\"streetAddress\":\"Pappilankatu 25\"},\"dateObserved\":\"2019-03-05T14:27:25.655000+00:00Z\",\"location\":{\"type\":\"Point\",\"coordinates\":[24.857861,60.623319000]},\"reliability\":0.5,\"source\":\"https://fvh.io/ilmanlaatu2019\"},{\"id\":\"373773207E33010A\",\"type\":\"AirQualityObserved\",\"PM10\":2.6,\"PM2.5\":1.1,\"address\":{\"addressCountry\":\"FI\",\"addressLocality\":\"Helsinki\",\"streetAddress\":\"Louhikkotie 2\"},\"dateObserved\":\"2019-03-05T14:45:05.073000+00:00Z\",\"location\":{\"type\":\"Point\",\"coordinates\":[25.08106,60.2555]},\"reliability\":0.5,\"source\":\"https://fvh.io/ilmanlaatu2019\"},{\"id\":\"373773207E330107\",\"type\":\"AirQualityObserved\",\"PM10\":4.3,\"PM2.5\":1.4,\"address\":{\"addressCountry\":\"FI\",\"addressLocality\":\"Helsinki\",\"streetAddress\":\"Kuusmiehentie 58\"},\"dateObserved\":\"2019-03-05T14:44:01.408000+00:00Z\",\"location\":{\"type\":\"Point\",\"coordinates\":[24.923274,60.255094]},\"reliability\":0.5,\"source\":\"https://fvh.io/ilmanlaatu2019\"},{\"id\":\"373773207E33010B\",\"type\":\"AirQualityObserved\",\"PM10\":2,\"PM2.5\":0.6,\"address\":{\"addressCountry\":\"FI\",\"addressLocality\":\"Helsinki\",\"streetAddress\":\"Tilkankatu 14 C 33\"},\"dateObserved\":\"2019-03-03T08:27:40.921000+00:00Z\",\"location\":{\"type\":\"Point\",\"coordinates\":[24.895381300,60.199316400]},\"reliability\":0.5,\"source\":\"https://fvh.io/ilmanlaatu2019\"},{\"id\":\"373773207E33010E\",\"type\":\"AirQualityObserved\",\"PM10\":1.8,\"PM2.5\":0.8,\"address\":{\"addressCountry\":\"FI\",\"addressLocality\":\"Helsinki\",\"streetAddress\":\"Tuohustie 5a\"},\"dateObserved\":\"2019-03-05T14:45:03.520000+00:00Z\",\"location\":{\"type\":\"Point\",\"coordinates\":[24.944157,60.250996]},\"reliability\":0.5,\"source\":\"https://fvh.io/ilmanlaatu2019\"},{\"id\":\"373773207E33010F\",\"type\":\"AirQualityObserved\",\"PM10\":1.7,\"PM2.5\":0.4,\"address\":{\"addressCountry\":\"FI\",\"addressLocality\":\"Helsinki\",\"streetAddress\":\"Aleksis Kiven katu 74\"},\"dateObserved\":\"2019-03-05T14:45:46.435000+00:00Z\",\"location\":{\"type\":\"Point\",\"coordinates\":[24.940329000,60.194279000]},\"reliability\":0.5,\"source\":\"https://fvh.io/ilmanlaatu2019\"},{\"id\":\"373773207E330111\",\"type\":\"AirQualityObserved\",\"PM10\":4.5,\"PM2.5\":1.6,\"address\":{\"addressCountry\":\"FI\",\"addressLocality\":\"Helsinki\",\"streetAddress\":\"Tallberginkatu 1\"},\"dateObserved\":\"2019-03-05T14:46:03.232000+00:00Z\",\"location\":{\"type\":\"Point\",\"coordinates\":[24.903632000,60.161745000]},\"reliability\":0.5,\"source\":\"https://fvh.io/ilmanlaatu2019\"},{\"id\":\"373773207E330110\",\"type\":\"AirQualityObserved\",\"PM10\":2.1,\"PM2.5\":0.8,\"address\":{\"addressCountry\":\"FI\",\"addressLocality\":\"Espoo\",\"streetAddress\":\"Iirislahdentie 57 C 9\"},\"dateObserved\":\"2019-03-05T14:45:30.050000+00:00Z\",\"location\":{\"type\":\"Point\",\"coordinates\":[24.764498,60.153547700]},\"reliability\":0.5,\"source\":\"https://fvh.io/ilmanlaatu2019\"},{\"id\":\"373773207E330112\",\"type\":\"AirQualityObserved\",\"PM10\":1.1,\"PM2.5\":0.7,\"address\":{\"addressCountry\":\"FI\",\"addressLocality\":\"Helsinki\",\"streetAddress\":\"Caloniuksenkatu 2 C\"},\"dateObserved\":\"2019-03-05T14:45:11.513000+00:00Z\",\"location\":{\"type\":\"Point\",\"coordinates\":[24.919823,60.174124]},\"reliability\":0.5,\"source\":\"https://fvh.io/ilmanlaatu2019\"},{\"id\":\"373773207E330113\",\"type\":\"AirQualityObserved\",\"PM10\":2.3,\"PM2.5\":1.2,\"address\":{\"addressCountry\":\"\",\"addressLocality\":\"\",\"streetAddress\":\"\"},\"dateObserved\":\"2019-03-05T14:45:47.220000+00:00Z\",\"location\":{\"type\":\"Point\",\"coordinates\":[25.02504,60.258891000]},\"reliability\":0.5,\"source\":\"https://fvh.io/ilmanlaatu2019\"},{\"id\":\"373773207E330114\",\"type\":\"AirQualityObserved\",\"PM10\":2.2,\"PM2.5\":1.2,\"address\":{\"addressCountry\":\"FI\",\"addressLocality\":\"Helsinki\",\"streetAddress\":\"Välimerenkatu 1\"},\"dateObserved\":\"2019-03-05T14:45:21.163000+00:00Z\",\"location\":{\"type\":\"Point\",\"coordinates\":[24.921306000,60.160417000]},\"reliability\":0.5,\"source\":\"https://fvh.io/ilmanlaatu2019\"}]"


let omiConnection;

const onFly = [];

export function open(host) {
    return new Promise((resolve, reject) => {
        omiConnection = new WebSocket(host);

        omiConnection.onopen = () => {
            omiConnection.onmessage = event => {
                const first = onFly.shift();
                if (first)
                    first.resolve(event.data)
            };

            // function noop(){}
            // let ping = setInterval(function() {
            //      omiConnection.ping(noop);
            //      console.log("ping");
            //  }, 3000);

            return resolve(omiConnection);
        };

        omiConnection.onclose = () => {
            alert("close")
        };

        omiConnection.onerror = () => {
            alert("error")
        }
    })
}

export function close() {
    omiConnection.close();
}


export function write(lon, lat, distance = 500) {
    let omiEnvelope = `<omiEnvelope xmlns="http://www.opengroup.org/xsd/omi/1.0/" version="1.0" ttl="0">
<call msgformat="odf">
<msg>
<Objects xmlns="http://www.opengroup.org/xsd/odf/1.0/">
<Object>
<id>ParkingService</id>
<InfoItem name="FindParking">
<value unixTime="1503488290" type="odf" dateTime="2017-08-23T14:38:10.575+03:00">
<Objects>
<Object type="FindParkingRequest">
<id>Parameters</id>
<description lang="English">List of possible parameters to request.</description>
<InfoItem type="schema:Distance" name="DistanceFromDestination" required="true">
<value unixTime="1503488290" dateTime="2017-08-23T14:38:10.575+03:00">${distance}</value>
</InfoItem>
<Object required="true" type="schema:GeoCoordinates">
<id>Destination</id>
<InfoItem name="latitude" required="true">
<value unixTime="1503488290" type="xs:double" dateTime="2017-08-23T14:38:10.575+03:00">${lat}</value>
</InfoItem>
<InfoItem name="longitude" required="true">
<value unixTime="1503488290" type="xs:double" dateTime="2017-08-23T14:38:10.575+03:00">${lon}</value>
</InfoItem>
</Object>
<Object required="true" type="mv:ElectricVehicle">
<id>Vehicle</id>
</Object>
</Object>
</Objects>
</value>
</InfoItem>
</Object>
</Objects>
</msg>
</call>
</omiEnvelope>`;

    return new Promise((resolve, reject) => {
        omiConnection.send(omiEnvelope, err => {
            reject(err)
        });
        onFly.push({resolve, reject})
    })

}


const omiNode = "https://hi68ue9m1i.execute-api.eu-central-1.amazonaws.com/prod";

export function getFacility(id) {

    const omiEnvelope = `<omiEnvelope xmlns="http://www.opengroup.org/xsd/omi/1.0/" version="1.0" ttl="0">
  <read msgformat="odf">
    <msg><Objects xmlns="http://www.opengroup.org/xsd/odf/1.0/">
    <Object><id>ParkingService</id><Object><id>ParkingFacilities</id>
    <Object><id>${id}</id></Object></Object></Object></Objects></msg>
  </read>
</omiEnvelope>`;


    return fetch(omiNode, {
        method: 'POST',
        body: omiEnvelope,
    }).then(res => {
        return res.text()
    }).then(text => {
        console.log(text)
        return text
    });
}

export function deleteFacility(id, token) {

    const omiEnvelope = `<omiEnvelope xmlns="http://www.opengroup.org/xsd/omi/1.0/" version="1.0" ttl="0">
    <delete msgformat="odf">
        <msg><Objects xmlns="http://www.opengroup.org/xsd/odf/1.0/"><Object><id>ParkingService</id>
        <Object><id>ParkingFacilities</id>
        <Object><id>${id}</id></Object></Object></Object></Objects></msg>
    </delete>
    </omiEnvelope>`;

    return fetch(omiNode, {
        method: 'POST',
        body: omiEnvelope,
        headers: {
            Authorization: `Bearer ${token}`
        }
    }).then(res => {
        return res.text()
    }).then(text => {
        console.log(text)
        return text
    });

}
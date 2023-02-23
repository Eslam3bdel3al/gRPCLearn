const GRPC = require('@grpc/grpc-js');
const PROTO_LOADER = require('@grpc/proto-loader');
const { Console } = require('console');

const PROTO_PATH = __dirname + '/grpc_guide.proto';

let packageDefinition = PROTO_LOADER.loadSync(
    PROTO_PATH,
    {keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
    });

let protoDescriptor = GRPC.loadPackageDefinition(packageDefinition);
let routeguide = protoDescriptor.routeguide;
//------------------------------------------------ til here shared in server and client
const FS = require('fs');
const _ = require('lodash');

const COORD_FACTOR = 1e7;
const R = 6371000; // earth radius in metres

let feature_list = JSON.parse(FS.readFileSync('./route_guide_db.json'));

function sayHello(call, callback){
    callback(null,{greeting: `hello ${call.request.name}`});
};

function checkFeature (point) {
    let feature;
    //Check if there is already a feature object for the given point
    feature_list.forEach((feat) => {
        if (feat.location.latitude === point.latitude && 
            feat.location.longitude === point.longitude){
            
            feature = feat;
            return;
        }
    });
    return feature;
};

function GetFeature (call, callback){
    let feature = checkFeature(call.request);
    if (!feature){
        const err = new Error("there are no features in the given location");
        err.code = GRPC.status.NOT_FOUND;
        callback(err);
    }
    callback(null, feature);
};

function ListFeatures(call) {
    const lo = call.request.lo;
    const hi = call.request.hi;

    const right = _.max([lo.longitude, hi.longitude]);
    const left = _.min([lo.longitude, hi.longitude]);
    const top = _.max([lo.latitude, hi.latitude]);
    const bottom = _.min([lo.latitude, hi.latitude]);

    let foundFeatures = [];
    feature_list.forEach((feat) => {
        if (feat.location.latitude <= top &&
            feat.location.latitude >= bottom &&
            feat.location.longitude <= right &&
            feat.location.longitude >= left)
        {
            foundFeatures.push(feat);
            call.write(feat);
        };
    });
    if (foundFeatures.length === 0){
        const err = new Error("there are no features found in that Rectangle");
        err.code = GRPC.status.NOT_FOUND;
        call.emit('error',err);
    }
    call.end();
}

function getDistance(start, end) {
    function toRadians(num) {
        return num * Math.PI / 180;
    };

    let lat1 = toRadians( start.latitude / COORD_FACTOR );
    let lat2 = toRadians( end.latitude / COORD_FACTOR );
    let long1 = toRadians( start.longitude / COORD_FACTOR );
    let long2 = toRadians( end.latitude / COORD_FACTOR );

    let deltaLat = lat2-lat1;
    let deltaLon = long2-long1;

    let a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
        Math.cos(lat1) * Math.cos(lat2) *
        Math.sin(deltaLon/2) * Math.sin(deltaLon/2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}


/*
 * recordRoute handler. Gets a stream of points, and responds with statistics
 * about the "trip": number of points, number of known features visited, total
 * distance traveled, and total time spent.
*/
function RecordRoute(call, callback){
    let point_count = 0;
    let feature_count = 0;
    let distance = 0;
    let previous = null;

    let start_time = process.hrtime();

    call.on('data', (point) => {
        point_count += 1;

        if (checkFeature(point)){
            feature_count += 1;
        };

        /* For each point after the first, add the incremental distance from the
        * previous point to the total distance value */
       if ( previous != null ){
        distance += getDistance(previous, point);
       };
       previous = point;
    });

    call.on('end', () => {
        callback(null, {
            point_count,
            feature_count,
            distance,
            elapsed_time: process.hrtime(start_time)[0] //time in millesecond
        });
    });
};

function main(){
    let server = new GRPC.Server()
    server.addService(routeguide.Routeguide.service,{sayHello, GetFeature, ListFeatures, RecordRoute});
    server.bindAsync('127.0.0.1:50051', GRPC.ServerCredentials.createInsecure(), () => {
        server.start();
    });
}

main();

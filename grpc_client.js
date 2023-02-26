
const GRPC = require('@grpc/grpc-js');
const PROTO_LOADER = require('@grpc/proto-loader');

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


function main() {
    let client = new routeguide.Routeguide('localhost:50051', GRPC.credentials.createInsecure());
    
    // say hello
    client.sayHello({name: "eslam"}, (err, Response) => {
        console.log(Response.greeting);
    });

    // a simple rpc
    client.GetFeature({latitude: 413628155, longitude: -749015466}, (err, Response) => {
        if (err) {
            if (err.code === 5){
                console.error(err.code, 'NOT_FOUND', err.details);
            } else {
                console.error(err.code, err.details);
            }
        } else {
            console.log(Response);
        }
    });

    // A server side streaming RPC.
    let listFeturesCall = client.ListFeatures(
        {   
            lo: {latitude: 407838352, longitude: -746143764},
            hi: {latitude: 407838352, longitude: -746143764}
        });
    
    listFeturesCall.on('data', (feat) => {
        console.log(feat);
    });

    listFeturesCall.on('error', (err) => {
        if (err.code === 5){
            console.error(err.code, 'NOT_FOUND', err.details);
        } else {
            console.error(err.code, err.details);
        }
    });

    listFeturesCall.on('end', () => {
        console.log('stream ended');
    });

    // A client side streaming RPC.
    let RouteSummaryCall =  client.RecordRoute((err, data) => {
        if (err){
            console.log('the error', err);
        };
        console.log(data);
        if (data) {
            console.log('Finished trip with', data.point_count, 'points');
            console.log('Passed', data.feature_count, 'features');
            console.log('Travelled', data.distance, 'meters');
            console.log('It took', data.elapsed_time, 'seconds');
        }
    });

    RouteSummaryCall.write({
        latitude: 407838351, longitude: -746143763    
    });

    RouteSummaryCall.write({
        latitude: 407838351, longitude: -746143763    
    });
    
    RouteSummaryCall.write({
        latitude: 408122808, longitude: -743999179    
    });
    RouteSummaryCall.write({
        latitude: 416802456, longitude: -742370183    
    });
    RouteSummaryCall.end();

    // A Bidirectional streaming RPC.
    let routeChatCall = client.RouteChat();

    routeChatCall.on('data', (note) => {
        console.log(`Got message ${note.message} at ${note.location.latitude}, ${note.location.longitude}`);
    });

    routeChatCall.on('end', () => {
        console.log('stream ended');
    });

    let notes = [{
        location: {
          latitude: 0,
          longitude: 0
        },
        message: 'First message'
      }, {
        location: {
          latitude: 0,
          longitude: 1
        },
        message: 'Second message'
      }, {
        location: {
          latitude: 1,
          longitude: 0
        },
        message: 'Third message'
      }, {
        location: {
          latitude: 0,
          longitude: 0
        },
        message: 'Fourth message'
      }];

      notes.forEach((note)=>{
        console.log('Sending message "' + note.message + '" at ' +
            note.location.latitude + ', ' + note.location.longitude);
        routeChatCall.write(note);
      });
      routeChatCall.end();
};

main();

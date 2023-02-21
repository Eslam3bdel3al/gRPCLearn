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

function sayHello(call, callback){
    callback(null,{greeting: `hello ${call.request.name}`});
} ;

function main(){
    let server = new GRPC.Server()
    server.addService(routeguide.Routeguide.service,{sayHello});
    server.bindAsync('127.0.0.1:50051', GRPC.ServerCredentials.createInsecure(), () => {
        server.start();
    });
}

main();

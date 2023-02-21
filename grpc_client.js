
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
    client.sayHello({name: "eslam"}, (err, Response) => {
        console.log(Response.greeting);
    });
};

main();

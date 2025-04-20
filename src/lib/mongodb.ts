import { MongoClient, MongoClientOptions } from "mongodb";

console.log('DEBUG: MONGODB_URI=', process.env.MONGODB_URI);
if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}

const uri = process.env.MONGODB_URI;
// Configure MongoClient TLS options in development to bypass cert & hostname checks
let options: MongoClientOptions = {};
if (process.env.NODE_ENV === 'development') {
  options = {
    tls: true,
    tlsAllowInvalidCertificates: true,
    tlsAllowInvalidHostnames: true,
    serverSelectionTimeoutMS: 5000
  };
}
console.log('DEBUG: NODE_ENV=', process.env.NODE_ENV, 'options=', options);

let client;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect().catch((e: Error) => {
      const stack = e.stack?.split('\n').slice(0,5).join('\n') || e.toString();
      console.error('MongoDB connection error (truncated):', stack);
      throw e;
    });
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect().catch((e: Error) => {
    const stack = e.stack?.split('\n').slice(0,5).join('\n') || e.toString();
    console.error('MongoDB connection error (truncated):', stack);
    throw e;
  });
}

export default clientPromise;

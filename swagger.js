const swaggerAutogen = require('swagger-autogen')();

const doc = {
  info: {
    title: 'SalesERP API',
    description: 'Sales ERP Management System API'
  },
  host: 'localhost:5000',
//   host: 'api.saleserp.com',
  basePath: '/',
  schemes: ['http']
};

const outputFile = './swagger-output.json';
const endpointsFiles = ['./server.js']; 

swaggerAutogen(outputFile, endpointsFiles, doc);


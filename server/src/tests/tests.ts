import { buildFantomDocs, initFantomDocs } from '../utils/fanUtils';

async function testBuildFantomDocs() {
    try {
        console.log(" ----------- test start ------------- get fantom docs");
        const docs = await buildFantomDocs();
        // console.log('Fantom Docs:', JSON.stringify(docs, null, 2));
        console.log("----------- test end ------------- test success ");
    } catch (error) {
        console.log("----------- test fail ------------- test fail ");
        console.error('Error:', error);
    }
}

async function testInitFantomDocs() {
    try {
        console.log(" ----------- test start ------------- init fantom docs");
        const docs = await initFantomDocs();
        console.log('Fantom Docs:', JSON.stringify(docs, null, 2));
        console.log("----------- test end ------------- test success ");
    } catch (error) {
        console.log("----------- test fail ------------- test fail ");
        console.error('Error:', error);
    }
}

testInitFantomDocs();
testBuildFantomDocs();
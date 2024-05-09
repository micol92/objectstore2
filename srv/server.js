const express = require('express');
const app = express();
const fs = require('fs');
const bodyParser = require('body-parser');
const formidable = require('formidable');
const { S3Client, PutObjectCommand, ListObjectsCommand, GetObjectCommand } = require("@aws-sdk/client-s3");

const regionV = "ap-northeast-2";
const endPointV = "s3-ap-northeast-2.amazonaws.com";

//#please revise your own key.
const accessKeyIdV = "######";

//#please revise your own key.
const secretAccessKeyV = "#########";

//#please revise your own key.
const bucketV = "hcp-######8";

const xsenv = require('@sap/xsenv');
xsenv.loadEnv();
const services = xsenv.getServices({
    uaa: { tag: 'xsuaa' }
});


const xssec = require('@sap/xssec');
const passport = require('passport');
passport.use('JWT', new xssec.JWTStrategy(services.uaa));
app.use(passport.initialize());
app.use(passport.authenticate('JWT', {
    session: false
}));

function makeid(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ extended: true }));

app.get('/srv/s3', function (req, res) {
    if (req.authInfo.checkScope('$XSAPPNAME.User')) {
        const client = new S3Client({ region: regionV, endPoint: endPointV, credentials: { accessKeyId: accessKeyIdV, secretAccessKey: accessKeyIdV } });
        var keyid = makeid(5).concat(".txt");
        var content = makeid(5);

        const params =
        {
            Bucket: bucketV, // The name of the bucket. For example, 'sample_bucket_101'.
            Key: keyid, // The name of the object. For example, 'sample_upload.txt'.
            Body: content // The content of the object. For example, 'Hello world!".
        };
        const putCommand = new PutObjectCommand(params);
        client.send(putCommand).then(data => {
            res.status(200).send(data);
        }).catch(err => {
            res.status(500).send(err);
        });
    } else {
        res.status(403).send('Forbidden');
    }
});

app.post('/srv/s3/upload', function (req, res) {
    const form = new formidable.IncomingForm();
    const client = new S3Client({ region: regionV, endPoint: endPointV, credentials: { accessKeyId: accessKeyIdV, secretAccessKey: secretAccessKeyV } });
    const params =
    {
        Bucket: bucketV, // The name of the bucket. For example, 'sample_bucket_101'.
        Key: "",
        Body: ""
    };
    form.parse(req, function (err, fields, files) {

        if (err) {
            return res.status(400).json({ error: err.message });
        }
        const [firstFile] = Object.values(files);

        params.Key = firstFile.originalFilename;
        const file = fs.readFileSync(firstFile.filepath);
        params.Body = file;
        const putCommand = new PutObjectCommand(params);
        client.send(putCommand).then(data => {
            res.status(200).send(data);
        }).catch(err => {
            console.log(err);
            res.status(500).send(err);
        });
    });
});

app.post('/srv/s3/download', function (req, res) {
    const client = new S3Client({ region: regionV, endPoint: endPointV, credentials: { accessKeyId: accessKeyIdV, secretAccessKey: secretAccessKeyV } });
    var keyV = req.body.key;
    const params =
    {
        Bucket: bucketV,
        Key: keyV,
    };
    const getCommand = new GetObjectCommand(params);
    client.send(getCommand).then(data => {
        console.log(data);
        const chunks = []
        const stream = data.Body;
        stream.on('data', chunk => chunks.push(chunk));
        stream.once('end', () => res.status(200).send(chunks));
    }).catch(err => {
        console.log(err.message);
        res.status(500).send(err.message);
    });

});


app.get('/srv/s3/list', function (req, res) {
    if (req.authInfo.checkScope('$XSAPPNAME.User')) {
        const client = new S3Client({ region: regionV, endPoint: endPointV, credentials: { accessKeyId: accessKeyIdV, secretAccessKey: secretAccessKeyV } });

        const params =
        {
            Bucket: bucketV // The name of the bucket. For example, 'sample_bucket_101'.

        };
        const putCommand = new ListObjectsCommand(params);
        client.send(putCommand).then(data => {
            res.status(200).send(data);
        }).catch(err => {
            res.status(500).send(err);
        });
    } else {
        res.status(403).send('Forbidden');
    }
});

app.get('/srv', function (req, res) {
    if (req.authInfo.checkScope('$XSAPPNAME.User')) {
        res.status(200).send('objstore');
    } else {
        res.status(403).send('Forbidden');
    }
});

app.get('/srv/user', function (req, res) {
    if (req.authInfo.checkScope('$XSAPPNAME.User')) {
        res.status(200).json(req.user);
    } else {
        res.status(403).send('Forbidden');
    }
});

const port = process.env.PORT || 5001;
app.listen(port, function () {
    console.info('Listening on http://localhost:' + port);
});
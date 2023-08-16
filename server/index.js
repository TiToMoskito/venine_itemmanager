const root = GetResourcePath(GetCurrentResourceName());
const ox_root = GetResourcePath("ox_inventory");
const image_path = path.join(ox_root, 'web', 'images');
const itemsFile = path.join(ox_root, 'data', 'items.lua');
const configPath = path.join(root, 'config.json');

const express = require('express');
const expressLayouts = require('express-ejs-layouts')
const multer = require('multer');
const { format, parse } = require('lua-json');
const config = require(configPath);

const app = express();

app.use(express.static(`${root}/html`));
app.use('/images', express.static(image_path));
app.use(express.urlencoded({ extended: true }))
app.use(expressLayouts)

app.set('views', `${root}/views`);
app.set('layout', './layouts/main-layout')
app.set('view engine', 'ejs');

var items = null;

// -----------------------------------------------------------------
// READ ITEMS.LUA
const vec3fix = (luaAssignment) => {
    const regex = /(\w+)\s*=\s*(vector3|vec3)\s*\(\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*\)/g;
    const modifiedLuaCode = luaAssignment.replace(regex, '$1 = { x= $3, y= $4, z= $5 }');
    return modifiedLuaCode;
};

fs.readFile(itemsFile, { encoding: 'utf8' }, (err, data) => {
    setImmediate(() => {
        try {
            let file = data.replaceAll("`", "'")
            let vecClear = vec3fix(file);
            items = parse(vecClear);
        } catch (error) {
            console.error(error);
        }
    });
});;

// -----------------------------------------------------------------

// -----------------------------------------------------------------
// FILE UPLOAD
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, image_path);
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const originalName = path.basename(file.originalname, path.extname(file.originalname));
        const extension = path.extname(file.originalname);
        const newFileName = `${originalName}_${timestamp}${extension}`;
        cb(null, newFileName);
    },
});

const upload = multer({ storage: storage });
// -----------------------------------------------------------------

// -----------------------------------------------------------------
// CREATE / EDIT ITEM

const setItem = (form, add) => {
    let key = form.params.key;
    let label = form.body.label;
    let description = form.body.description;
    let weight = parseInt(form.body.weight);
    let stackCheck = form.body.stackCheck;
    let closeCheck = form.body.closeCheck;
    let animDict = form.body.dict;
    let animClip = form.body.clip;
    let animFlag = form.body.flag;

    if (add) {
        key = form.body.key;
        if (items.hasOwnProperty(key)) {
            return;
        }
        items[key] = {};
    }

    if (form.file) {
        if (!items[key].client) {
            items[key].client = {};
        }
        items[key].client.image = form.file.filename;
    }

    if (!stackCheck) {
        stackCheck = false;
    } else {
        if (stackCheck === "on") {
            stackCheck = true;
        }
    }

    if (!closeCheck) {
        closeCheck = false;
    } else {
        if (closeCheck === "on") {
            closeCheck = true;
        }
    }

    if (!description) {
        description = "";
    }

    if (!weight) {
        weight = 0;
    }

    if (animDict && animClip) {
        if (!items[key].client) {
            items[key].client = {};
        }
        if (!items[key].client.anim) {
            items[key].client.anim = {};
        }
        items[key].client.anim.dict = animDict;
        items[key].client.anim.clip = animClip;

        if (animFlag) {
            items[key].client.anim.flag = animFlag;
        }
    }

    items[key].label = label;
    items[key].description = description;
    items[key].weight = weight;
    items[key].stack = stackCheck;
    items[key].close = closeCheck;

    fs.writeFile(itemsFile, format(items), err => {
        if (err) {
            console.error(err);
        }
    });
};

// -----------------------------------------------------------------

app.get('/', (req, res) => {
    res.render('dashboard');
});

app.get('/additem', (req, res) => {
    res.render('add_item');
});

app.get('/get_data', function (req, res) {
    let data_arr = [];
    let keys = Object.keys(items);
    for (var i = 0; i < keys.length; i++) {
        if (items.hasOwnProperty(keys[i])) {
            let key = keys[i];
            let val = items[key];

            // console.log("i: " + i);
            //console.log("key: " + key);
            //console.log("val: " + JSON.stringify(val));

            let canStack = `<input class="form-check-input" type="checkbox" disabled>`
            if (val.stack != null && val.stack) {
                canStack = `<input class="form-check-input" type="checkbox" checked disabled>`
            }

            let canClose = `<input class="form-check-input" type="checkbox" disabled>`
            if (val.close != null && val.close) {
                canClose = `<input class="form-check-input" type="checkbox" checked disabled>`
            }

            data_arr.push({
                'key': key,
                'label': val.label,
                'weight': val.weight == null ? 0 : val.weight,
                'stack': canStack,
                'close': canClose
            });
        }
    }

    try {
        res.json(data_arr);
    } catch (error) {
        console.error(error);
    }
});

app.get('/item/edit/:id', (req, res) => {
    let image = "";
    if (items[req.params.id].client && items[req.params.id].client.image) {
        image = path.join("/images/", items[req.params.id].client.image);
    }
    res.render('edit_item', { key: req.params.id, item: items[req.params.id], img: image });
});

app.post('/additem', upload.single('image'), (req, res) => {
    setItem(req, true);
    res.redirect('/');
});

app.post('/edititem/:key', upload.single('image'), (req, res) => {
    setItem(req);
    res.redirect('/');
});

app.get('/deleteitem/:key', (req, res) => {
    let key = req.params.key;
    console.log("deleteitem " + key);

    if (items.hasOwnProperty(key)) {
        delete items[key];
        console.log("gelöscht");
    }

    fs.writeFile(itemsFile, format(items), err => {
        if (err) {
            console.error(err);
        }
    });

    res.redirect('/');
});

app.listen(config.port, config.host, () => console.log(`Server listening on ${config.host}:${config.port}`));
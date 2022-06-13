import {app} from './app.js';
import {config} from 'dotenv'; //2k (gzipped: 1k)
import {connectDatabase} from "./config/database.js";
import cloudinary from 'cloudinary';

config({
    path: "./config/config.env"
});

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET,
});

connectDatabase();

/* LO ANTIGUO
app.listen(process.env.PORT,()=>{
    console.log("Server is running on port -> " + process.env.PORT);
});
*/

//LO NUEVO
const PORT = process.env.PORT || 4000
//

    app.listen(PORT, function() {
        console.log("Server is running on port ->->->->-> " + PORT);
    } )


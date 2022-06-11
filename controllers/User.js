import {User} from "../models/users.js";
import { sendMail } from "../utils/sendMail.js";
import { sendToken } from "../utils/sendToken.js";
import cloudinary from "cloudinary";
import fs from 'fs';

//////////////////////////////////////////////////////////
///FUNCIONES DE REGISTRAR, VERIFICAR, LOGIN, LOGOUT///////
//////////////////////////////////////////////////////////

export const register = async (req, res) => {

    try {

        //const {name, email, password} = req.body;
        const {name, email, password} = req.body;
        
        const avatar = req.files.avatar.tempFilePath;
        


        let user = await User.findOne({email});

        if (user){
            return res
                .status(400)
                .json({ success: false, message: "User already exists" });

        }

        console.log("valor ->  " + req.body.name);
        //Esto genera un número aleatorio
        const otp = Math.floor(Math.random() * 1000000);

        //Si le colocas folder: "todoApp" te crea un repositorio local y a la vez te crea
        //una carpeta en la nube de cloudinary con el nombre "todoApp" en donde se alojarán tus imagenes
        //const mycloud = await cloudinary.v2.uploader.upload(avatar, {
        //    folder: "todoApp",
        //});

        //Con esta linea de código NO se almacenan las imagenes de manera local
        //y las imagenes se suben a la nube y caen defrente sin carpetas
        const mycloud = await cloudinary.v2.uploader.upload(avatar);

        fs.rmSync("./tmp",{ recursive: true });

        //Parece que la linea de otp_expiry es para que el numero cambio o caduque de vez en cuando
        user = await User.create({ 
            name,
            email,
            password,
            avatar:{
                public_id: mycloud.public_id,
                url: mycloud.secure_url,
            }, 
            otp,                            
            otp_expiry: new Date(Date.now() + process.env.OTP_EXPIRE * 60 * 1000),
        });

        await sendMail(email, "Verify your account", `Your OTP is ${otp}`);

        sendToken(
            res,
            user,
            201,
            "OTP sent to your email, please verify your account"
            );
 
 
        } catch (error) {
        res.status(500).json({ success: false, message: "save->>>>> " + error.message });
    }
};



export const verify = async(req, res) =>{
    
    try{

        const otp = Number(req.body.otp);
        
        const user = await User.findById(req.user._id);
        
        

        if(user.otp !== otp || user.otp_expiry < Date.now()){
            return res
            .status(400)
            .json({ success: false, message: "Invalid OTP or has been Expired" })
        }

        console.log("holas");
        user.verified = true;
        user.otp = null;
        user.otp_expiry = null;

        await user.save();

        
        sendToken(res, user, 200, "Account verified")



    }catch (error){
        res.status(500).json({success: false, message: error.message })
    }


}




export const login = async (req, res) => {

    try {

        const {email, password} = req.body;

        //const {avatar} = req.files;

        if(!email || !password){
            return res
                .status(400)
                .json({success: false, message: "Please enter all fields"  });
        }
        const user = await User.findOne({email}).select("+password");

        if (!user){
            return res
                .status(400)
                .json({ success: false, message: "Invalid Email or Password" });
        }

        //Esto genera un número aleatorio
        //const otp = Math.floor(Math.random() * 1000000);

        const isMatch = await user.comparePassword(password);

        if(!isMatch){
            return res
                .status(400)
                .json({ success: false, message: "Invalid Email or Password" });
        }

        
        sendToken(
            res,
            user,
            200,
            "Login Successful"
            );
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


export const logout = async(req, res) => {

    try {
        res
        .status(200)
        .cookie("token", null,{expires: new Date(Date.now()),
        })
        .json({success: true, message: "Logged out successfully"  })
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


export const addTask = async(req, res) => {

    try {
        
        const {title, descripcion} = req.body

        const user = await User.findById(req.user._id);

        user.tasks.push({
            title,
            descripcion,
            completed: false,
            createdAt: new Date(Date.now()),
        });

        await user.save();

        res
        .status(200)
        .json({ success: true, message: "Task added successfuly" });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


export const removeTask = async(req, res) => {

    try {
        
        const {taskId } = req.params;

        const user = await User.findById(req.user._id);

        user.tasks = user.tasks.filter(task => task._id.toString() !== taskId.toString());

        await user.save();

        res
        .status(200)
        .json({ success: true, message: "Task removed successfuly" });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


export const updateTask = async(req, res) => {

    try {
        
        const {taskId } = req.params;

        const user = await User.findById(req.user._id);

        user.task = user.tasks.find((task) =>  task._id.toString() === taskId.toString());

        user.task.completed = !user.task.completed;
        
        await user.save();

        res
        .status(200)
        .json({ success: true, message: "Task Updated successfuly" });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getMyProfile = async(req, res) => {

    try {
        
        const user = await User.findById(req.user._id);

        sendToken(res, user, 201, `Welcome back ${user.name}`);

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


export const updateProfile = async(req, res) => {

    try {
        
        const user = await User.findById(req.user._id);

        const {name} = req.body;
        const avatar = req.files.avatar.tempFilePath;

        if (name) user.name = name;

        if (avatar){
            await cloudinary.v2.uploader.destroy(user.avatar.public_id);

            const mycloud = await cloudinary.v2.uploader.upload(avatar);

            fs.rmSync("./tmp",{ recursive: true });

            user.avatar = {
                public_id: mycloud.public_id,
                url: mycloud.secure_url,
            }

        }

        await user.save();

        res
        .status(200)
        .json({ success: true, message: "Profile Updated successfuly" });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


export const updatePassword = async(req, res) => {

    try {
        
        const user = await User.findById(req.user._id).select("+password");

        const {oldPassword, newPassword} = req.body;

        if(!oldPassword || !newPassword){
            return res
            .status(400)
            .json({ success: false, message: "Please enter all fields" });
        }
        
        const isMatch = await user.comparePassword(oldPassword);

        if (!isMatch){
            return res
            .status(200)
            .json({ success: false, message: "Invalid Old Password" });
        }

        user.password = newPassword;

        await user.save();

        res
            .status(200)
            .json({ success: true, message: "Password Update Successfully" });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


export const forgetPassword = async(req, res) => {

    try {
        
        const {email} = req.body;
        
        const user = await User.findOne({email});

        if(!user){
            return res.status(400).json({ success: false, message: "Invalid Email" });
        }

       //Esto genera un número aleatorio
       const otp = Math.floor(Math.random() * 1000000);

       user.resetPasswordOtp = otp;
       user.resetPasswordOtpExpiry = Date.now() + 10 * 60 * 1000;

       await user.save();

       //Creo que aquí usa el tipo de comillas invertidas porque tiene
       // un objeto javascript insertado entre {}
       const message = `Your OTP for reseting the password ${otp}. If you did not request for this, 
       please ignore this mail.`;

       await sendMail(email, "Request for Reseting Password", message );

        res
            .status(200)
            .json({ success: true, message: `OTP sent to ${email}`});

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


//El nombre resetPassword es el que va como segundo argumento en los metodos POST, GET o lo que sea
export const resetPassword = async(req, res) => {

    try {
        
        const {otp, newPassword} = req.body;
        
        const user = await User.findOne({
            resetPasswordOtp: otp,
            resetPasswordExpiry: { $gt: Date.now() },
        }).select("+password");

        if(!user){
            return res.status(400).json({ success: false, message: "Otp Invalid or has been Expired" });
        }

       user.password = newPassword;
       user.resetPasswordOtp = null;
       user.resetPasswordExpiry = null;
       await user.save();

       

        res
            .status(200)
            .json({ success: true, message: `Password Changed Successfully`});

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

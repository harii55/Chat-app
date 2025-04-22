import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import { getReceiverSocketId } from "../lib/socket.js";
import { v2 as cloudinary } from 'cloudinary';
import { io } from "../lib/socket.js";
import mongoose from "mongoose";

export const getUsersForSidebar = async (req, res) => {
    try {

        const loggedInUserId = req.user._id; // Get the logged-in user's ID from the request object
        // Fetch all users except the logged-in user
        const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select(
            "-password -__v"
        );

        res.status(200).json(filteredUsers);
    } catch (error) {
        console.error("Error fetching users for sidebar:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
}


export const getMessages = async (req, res) => {
    try {
        const { id: userToChatId } = req.params;
        const myId = req.user._id;

        const messages = await Message.find({
            $or: [
                { senderId: myId, receiverId: userToChatId },
                { senderId: userToChatId, receiverId: myId },
            ],
        });

        res.status(200).json(messages);
    } catch (error) {
        console.log("Error in getMessages controller: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const sendMessage = async (req, res) => {
    try {

        const { text, image } = req.body;
        const { id: receiverId } = req.params;
        const senderId = req.user._id;

        let imageurl;

        if (image) {
            //Upload base64 image to Cloudinary
            const uploadResponse = await cloudinary.uploader.upload(image);
            imageurl = uploadResponse.secure_url;
        }
        console.log("New message added:");
        const newMessage = new Message({

            senderId,
            receiverId,
            text,
            image: imageurl,
        });
        await newMessage.save();
        const receiverSocketId = getReceiverSocketId(receiverId);
        if (receiverSocketId) {

            io.to(receiverSocketId).emit("newMessage", newMessage); // Emit the new message to the receiver's socket only

        }

        res.status(201).json(newMessage);

    } catch (err) {
        console.log(err.message);
    }
}
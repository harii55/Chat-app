
import { create } from 'zustand';
import { axiosInstance } from '../lib/axios.js';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';

const BASE_URL = import.meta.env.MODE === "development" ? "http://localhost:5000/api" : "/";



export const useAuthStore = create((set,get) => ({
    authUser: null,
    isSigningUp: false,
    isLoggingIn: false,
    isUpdatingProfile: false,
    isCheckingAuth: true,
    //start with true to show the loader while checking auth [first time entering the app,[while reloading] all other states will be false]
    onlineUsers: [], 
    socket: null, // Initialize socket to null
    

    // makes an axios call to /auth/check-auth
    checkAuth: async () => {

        try {
            //fetch the auth user from the backend using the axios instance
            const res = await axiosInstance.get('/auth/check-auth');

            set({ authUser: res.data });
            //we are setting the authUser state from the null to the response data
            
            get().connectSocket(); // Call the connectSocket function after checking auth
      
        } catch (error) {
            console.error("Error checking authentication:", error);
            set({ authUser: null });
        } finally {
            set({ isCheckingAuth: false });
        }
    },

    // posts data to /auth/signup
    signUp: async (data) => {
        set({ isSigningUp: true });
        try {
            const res = await axiosInstance.post('/auth/signup', data);
            set({ authUser: res.data });
            // Show success toast
            toast.success("Account created successfully!");
            // Call the connectSocket function after signup
            get().connectSocket(); 
        } catch (error) {
            toast.error(error.response.data.message);
        } finally {
            set({ isSigningUp: false });
        }
    },

    logout: async () => {
        try {
            await axiosInstance.post('/auth/logout');
            set({ authUser: null });
            toast.success("Logged out successfully!");
            get().disconnectSocket(); // Call the disconnectSocket function after logout

        } catch (error) {
            toast.error(error.response.data.message);
        }
    },

    login: async (data) => {
        set({ isLoggingIn: true });
        try {
            const res = await axiosInstance.post('/auth/login', data);
            set({ authUser: res.data });
            // Show success toast
            toast.success("Logged in successfully!");
            get().connectSocket(); // Call the connectSocket function after login

        } catch (error) {
            toast.error(error.response.data.message);
        } finally {
            set({ isLoggingIn: false });
        }
    },

    updateProfile: async (data) => {
        set({ isUpdatingProfile: true });
        try {
            const res = await axiosInstance.put('/auth/update-profile', data);
            set({ authUser: res.data });
            // Show success toast
            toast.success("Profile updated successfully!");
        } catch (error) {
            toast.error("error in updating profile pic",error);
        } finally {
            set({ isUpdatingProfile: false });
        }
    },
    
    connectSocket: () => { 

        const { authUser } = get(); // Get the authUser from the store
       
        // If not authenticated, do not connect to socket
        // If already connected, do not connect again
        // This prevents multiple socket connections when the user is already logged in       
        if (!authUser || get().socket?.connected) return;

        const socket = io(BASE_URL, {
            query: {
                userId: authUser._id,
            }
        });
        socket.connect(); 

        set({ socket: socket }); // Store the socket in the state

        socket.on("getOnlineUsers", (userId) => {
            set({ onlineUsers: userId });
            // console.log("Online users:", onlineUsers);
        });
    },

    disconnectSocket: () => { 
        if (get().socket?.connected) {
            get().socket.disconnect(); // Disconnect the socket if connected
            console.log("Disconnected from socket server:", get().socket.id);
        }
    },


}));


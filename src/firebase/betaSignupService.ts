import { db } from './config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export interface BetaSignupData {
  name: string;
  email: string;
  phoneNumber?: string;
  rating: number;
  remarks?: string;
}

export const saveBetaSignup = async (data: BetaSignupData) => {
  try {
    const betaSignupRef = collection(db, 'betaSignups');
    
    const docRef = await addDoc(betaSignupRef, {
      ...data,
      createdAt: serverTimestamp(),
    });
    
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error saving beta signup:', error);
    return { success: false, error };
  }
};
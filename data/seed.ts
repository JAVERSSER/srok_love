import { UserProfile, Notification } from "@/models";

export const defaultCurrentUser: UserProfile = {
  id: "me",
  name: "Your Name",
  age: 25,
  gender: "male",
  lookingFor: "Everyone",
  location: "Phnom Penh",
  city: "",
  bio: "Tell people a little about yourself.",
  photos: ["https://picsum.photos/seed/me/600/800"],
  interests: ["Coffee", "Travel"],
  occupation: "",
  education: "",
  height: "",
  relationshipGoal: "Serious relationship",
  verified: false,
};

export const seedNotifications: Notification[] = [
  {
    id: "n1",
    type: "like",
    text: "Sreyneang liked you.",
    createdAt: new Date(Date.now() - 3600_000).toISOString(),
    read: false,
  },
  {
    id: "n2",
    type: "message",
    text: "Dara sent you a message.",
    createdAt: new Date(Date.now() - 7200_000).toISOString(),
    read: false,
  },
  {
    id: "n3",
    type: "match",
    text: "You have a new match!",
    createdAt: new Date(Date.now() - 86400_000).toISOString(),
    read: true,
  },
];

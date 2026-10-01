import { UserProfile } from "@/models";

// Empty profile for a new account; filled in by create-profile / edit-profile.
export const defaultCurrentUser: UserProfile = {
  id: "me",
  name: "",
  age: 0,
  gender: "male",
  lookingFor: "Everyone",
  location: "Phnom Penh",
  city: "",
  bio: "",
  photos: [],
  interests: [],
  occupation: "",
  education: "",
  height: "",
  relationshipGoal: "",
  verified: false,
};

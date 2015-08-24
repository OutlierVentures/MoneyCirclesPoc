// The classes in this file are duplicates of the server-side model classes. The server side is the master version.

interface IUser {
    name: string;
    externalID: string;
    accessToken: string;
}
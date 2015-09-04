// The classes in this file are duplicates of the server-side model classes. The server side is the master version.

// Steps to update:
// for each file in /models {
//  copy/paste the "export interface I[Name]" interfaces
//  strip "export "
// }

interface ICircle {
    id: string;
    name: string;
    commonBond: string;
}


interface IUser {
    name: string;
    externalID: string;
    accessToken: string;
}
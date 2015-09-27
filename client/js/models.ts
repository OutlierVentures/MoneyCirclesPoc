// The classes in this file are duplicates of the server-side model classes. The server side is the master version.

// Steps to update:
// for each file in /models {
//  copy/paste the "export interface I[Name]" interfaces
//  strip "export "
// }

// TODO: remove duplication, allow a single file with model interfaces.
// TODO: ensure that client-side model interfaces have a property "id".

interface IDocument {
    _id: string;
}

interface ICircle extends IDocument {
    contractAddress: string;
    name: string;
    commonBond: string;
    /**
     * Circle administrators, by user ID
     */
    administrators: string[];
}

/**
 * Membership token of the user for a specific circle.
 */
// Circle membership is stored in the user document itself, not in a separate collection. To be able
// to work with this in a productive, typesafe manner we define it as a class. That way a circle
// membership can be created like so:
//  var cm = new CircleMembership();
//  cm.circleId = "12345";
//  myUser.circleMemberships.push(cm);
class CircleMembership {
    /**
     * The ID of the corresponding Circle.
     */
    circleId: string;
    /**
     * Join date
     */
    startDate: Date;

    /**
     * Date the user left the circle.
     */
    endDate: Date;
}


interface IUser extends IDocument {
    name: string;
    externalId: string;
    email: string;
    accessToken: string;
    circleMemberships: [CircleMembership];
}

interface IDeposit extends IDocument {
    fromCard: string;
    amount: number;
    circleId: string;
    userId: string;
    transactionId: string;
    depositIndex: number;
    currency: string;
    dateTime: Date;
}

interface ILoan extends IDocument {
    contractAddress: string;
    amount: number;
    circleId: string;
    userId: string;
    transactionId: string
    repaymentTransactionId: string;
    currency: string;
    dateTime: Date;
    purpose: string;
}

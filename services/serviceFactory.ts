import bitReserveService = require('./bitReserveService');
import stubBitReserveService = require('./stubBitReserveService');
import configurationService = require('./configurationService');

export interface IBitReserveService {
    getCards: (callback: bitReserveService.IBitReserveCardsCallback) => void;
    getUser: (callback: any) => void;
    createCard: (label: string, callback: bitReserveService.IBitReserveCardCallback) => void;
    createTransaction: (
    fromCard: string,
    amount: number,
    currency: string,
    recipient: string,
    callback: bitReserveService.IBitReserveTransactionCallback) => void;

    commitTransaction: (transaction: IBitReserveTransaction, callback: bitReserveService.IBitReserveTransactionCallback) => void
    getCardTransactions: (cardiId: string, callback: bitReserveService.IBitReserveTransactionsCallback) => void;
}

var config = new configurationService.ConfigurationService().getConfiguration();

export function createBitreserveService(token: string): IBitReserveService {
    if (config.useStubs) {
        return new stubBitReserveService.StubBitReserveService(token);
    }
    else {
        return new bitReserveService.BitReserveService(token);
    }
}

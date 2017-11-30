import m from 'mithril';
import I18n from 'i18n-js';
import projectVM from '../vms/project-vm';
import addressVM from '../vms/address-vm';
import models from '../models';
import h from '../h';

const I18nScope = _.partial(h.i18nScope, 'projects.contributions.edit.errors');
const {commonPayment} = models;
const sendPaymentRequest = (data) => commonPayment.postWithToken({data}, null, {
    'X-forwarded-For': '127.0.0.1'
});

const setNewCreditCard = (creditCardFields) => {
    const creditCard = new window.PagarMe.creditCard();
    creditCard.cardHolderName = creditCardFields.name();
    creditCard.cardExpirationMonth = creditCardFields.expMonth();
    creditCard.cardExpirationYear = creditCardFields.expYear();
    creditCard.cardNumber = creditCardFields.number();
    creditCard.cardCVV = creditCardFields.cvv();
    return creditCard;
};

const sendCreditCardPayment = (selectedCreditCard, fields, commonData) => {
    fields.isLoading(true);
    m.redraw();

    const meta = _.first(document.querySelectorAll('[name=pagarme-encryption-key]'));
    const encryptionKey = meta.getAttribute('content');

    window.PagarMe.encryption_key = encryptionKey;
    const card = setNewCreditCard(fields.creditCardFields);

    const customer = fields.fields;
    const address = customer.address();
    const phoneDdd = address.phone_number.match(/\(([^)]*)\)/)[1];
    const phoneNumber = address.phone_number.substr(5, address.phone_number.length);
    const addressState = _.findWhere(addressVM.states(), {id: address.state_id});
    const addressCountry = _.findWhere(addressVM.countries(), {id: address.country_id});

    card.generateHash(cardHash => {
        const payload = {
            subscription: true,
            user_id: commonData.userCommonId,
            project_id: commonData.projectCommonId,
            amount: commonData.amount,
            payment_method: 'credit_card',
            card_hash: cardHash,
            customer: {
                name: customer.completeName(),
                document_number: customer.ownerDocument(),
                address: {
                    neighborhood: address.address_neighbourhood,
                    street: address.address_street,
                    street_number: address.address_number,
                    zipcode: address.address_zip_code,
                    //TOdO: remove hard-coded country when international support is added on the back-end
                    country: 'Brasil',
                    state: addressState.acronym,
                    city: address.address_city,
                    complementary: address.address_complement,
                },
                phone: {
                    ddi: '55',
                    ddd: phoneDdd,
                    number: phoneNumber
                }
            }
        };

        if (commonData.rewardCommonId) {
            _.extend(payload, {reward_id: commonData.rewardCommonId});
        }

        sendPaymentRequest(payload)
            .then(() => {
                m.route(`/projects/subscriptions/thank_you?project_id=${projectVM.currentProject().project_id}`);
            })
            .catch((data) => {
                const errorMsg = data.message || I18n.t('submission.payment_failed', scope());
                fields.isLoading(false);
                fields.submissionError(I18n.t('submission.error',I18nScope({ message: errorMsg })));
                m.redraw();
            });
    });

};

const sendSlipPayment = (fields, commonData) => {
    fields.isLoading(true);
    m.redraw();

    const customer = fields.fields;
    const address = customer.address();
    const phoneDdd = address.phone_number.match(/\(([^)]*)\)/)[1];
    const phoneNumber = address.phone_number.substr(5, address.phone_number.length);
    const addressState = _.findWhere(addressVM.states(), {id: address.state_id});
    const addressCountry = _.findWhere(addressVM.countries(), {id: address.country_id});
    const payload = {
        subscription: true,
        user_id: commonData.userCommonId,
        project_id: commonData.projectCommonId,
        amount: commonData.amount,
        payment_method: 'boleto',
        customer: {
            name: customer.completeName(),
            document_number: customer.ownerDocument(),
            address: {
                neighborhood: address.address_neighbourhood,
                street: address.address_street,
                street_number: address.address_number,
                zipcode: address.address_zip_code,
                //TOdO: remove hard-coded country when international support is added on the back-end
                country: 'Brasil',
                state: addressState.acronym,
                city: address.address_city,
                complementary: address.address_complement,
            },
            phone: {
                ddi: '55',
                ddd: phoneDdd,
                number: phoneNumber
            }
        }
    };

    if (commonData.rewardCommonId) {
        _.extend(payload, {reward_id: commonData.rewardCommonId});
    }

    sendPaymentRequest(payload)
        .then(() => {
            m.route(`/projects/subscriptions/thank_you?project_id=${projectVM.currentProject().project_id}`);
        })
        .catch((data) => {
            const errorMsg = data.message || I18n.t('submission.payment_failed', scope());
            fields.isLoading(false);
            fields.submissionError(I18n.t('submission.error',I18nScope({ message: errorMsg })));
            m.redraw();
        });
};

const commonPaymentVM = {
    sendCreditCardPayment,
    sendSlipPayment
};

export default commonPaymentVM;
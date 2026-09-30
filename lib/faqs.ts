/**
 * Shared FAQ content.
 *
 * Single source of truth for the FAQ accordion on /contact, the dedicated
 * /faq page and the FAQPage structured data. Answers only describe how the
 * business actually operates — nothing here is speculative.
 */
export const FAQS: Array<{ question: string; answer: string }> = [
  {
    question: 'Do you sell at wholesale prices?',
    answer:
      'Yes. We supply mobile spare parts and accessories to retailers and distributors at wholesale prices. Register as a retailer and our team will share the dealer price list.',
  },
  {
    question: 'Can I order online and pay on this website?',
    answer:
      'This website is a catalogue. There is no online payment yet - send your requirement on WhatsApp or call the shop and we will confirm availability, price and delivery before you pay.',
  },
  {
    question: 'Do you deliver outside the city?',
    answer:
      'Yes, we deliver locally and arrange dispatch for other locations. Charges and timelines depend on quantity and distance, and are confirmed with your quotation.',
  },
  {
    question: 'Do you provide GST invoices?',
    answer: 'Yes, proper GST invoices are provided for all business orders.',
  },
  {
    question: 'How do I place a wholesale order?',
    answer:
      'Add the products you need to your wishlist, set the quantities and send the list in one message - or use the bulk enquiry form on the wishlist page. We reply with availability, minimum quantities and a total.',
  },
  {
    question: 'Is there a minimum order quantity?',
    answer:
      'Some products carry a minimum order quantity, which is shown on the product page. Products without a minimum can be ordered one at a time. Ask us if you need a mixed list.',
  },
  {
    question: 'Can I collect orders from the shop?',
    answer:
      'Yes. You are welcome to collect in person - our address and contact details are on the contact page. Confirm your order with us first so it is packed and ready.',
  },
  {
    question: 'How do I check whether a part will fit my phone?',
    answer:
      'Each product page lists the supported models. If your model is not listed, send us the model name or number on WhatsApp and we will confirm compatibility before you order.',
  },
];

-- Chat offer actions: add order_status message type and document structured offer metadata.

alter type public.message_type add value if not exists 'order_status';

comment on column public.messages.metadata is
  'offer_price: { "amount_eur": number, "counter_to_message_id"?: string }; offer_swap: { "swap_for_text": string, "photo_urls"?: string[] }';

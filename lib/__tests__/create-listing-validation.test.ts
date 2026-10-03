import { describe, expect, it } from "vitest";
import { validateCreateListingInput } from "@/lib/create-listing-validation";
import { isValidEuroAmount, parseEuroAmountStrict } from "@/lib/money-validation";
import { validateBid, computeMinBid } from "@/lib/bid-validation";
import type { CreateListingInput } from "@/lib/actions/create-listing";

const valid: CreateListingInput = {
  type:"fixed",swapEnabled:false,category:"plant",plantName:"Monstera",plantTaxonId:null,
  condition:"",size:"",notes:"",region:"Bratislavský kraj",district:"",fixedPrice:10,
  auctionStartPrice:null,auctionMinIncrement:null,auctionEndsAt:null,
  photoUrls:["https://test.supabase.co/storage/v1/object/public/listing-photos/user/photo.jpg"],
};
const now = new Date("2026-10-02T12:00:00Z");

describe("listing publication validation", () => {
  it("accepts a complete listing", () => expect(validateCreateListingInput(valid,now)).toBeNull());
  it.each([NaN,Infinity,-1,0,0.001,100_000_000])("rejects nonrepresentable fixed price %s",price=> {
    expect(validateCreateListingInput({...valid,fixedPrice:price},now)).not.toBeNull();
  });
  it.each(["garbage","2026-10-01T12:00:00Z",null])("rejects invalid or ended auction time %s",end=> {
    expect(validateCreateListingInput({...valid,type:"auction",fixedPrice:null,auctionStartPrice:10,auctionMinIncrement:1,auctionEndsAt:end},now)).not.toBeNull();
  });
  it("rejects missing photos and unsafe URLs",()=> {
    expect(validateCreateListingInput({...valid,photoUrls:[]},now)).not.toBeNull();
    expect(validateCreateListingInput({...valid,photoUrls:["javascript:alert(1)"]},now)).not.toBeNull();
  });
});

describe("strict euro parsing and bid validation",()=> {
  it.each(["12,50","12.50",12.5])("accepts localized money %s",value=> expect(parseEuroAmountStrict(value)).toBe(12.5));
  it.each(["12garbage","Infinity","-5","12.500","1e2",NaN,Infinity])("rejects malformed money %s",value=> expect(parseEuroAmountStrict(value)).toBeNull());
  it("allows zero budgets but requires positive offers",()=> {
    expect(parseEuroAmountStrict("0")).toBe(0);
    expect(isValidEuroAmount(0)).toBe(false);
  });
  it("avoids floating point minimum rejecting an exact cent bid",()=> {
    expect(computeMinBid(0.1,0.2,0.1)).toBe(0.3);
    expect(validateBid({startPrice:0.1,minIncrement:0.2,topBidAmount:0.1,amount:0.3,auctionEndsAt:new Date("2026-10-03"),now}).valid).toBe(true);
  });
  it.each([NaN,Infinity,0.001])("rejects invalid bids %s",amount=> {
    expect(validateBid({startPrice:10,minIncrement:1,topBidAmount:null,amount,auctionEndsAt:new Date("2026-10-03"),now}).valid).toBe(false);
  });
});

import type { OrderStatus } from "@/lib/data/orders";

export type OrderActor = "buyer" | "seller" | "other";

export type OrderTransitionInput = {
  from: OrderStatus;
  to: OrderStatus;
  actor: OrderActor;
  hasShippingAddress?: boolean;
};

export type OrderTransitionResult = {
  allowed: boolean;
  reason?: string;
};

export function canTransitionOrder(
  input: OrderTransitionInput
): OrderTransitionResult {
  const { from, to, actor, hasShippingAddress = false } = input;

  if (actor === "other") {
    return { allowed: false, reason: "Nie ste účastník objednávky." };
  }

  if (to === "negotiating") {
    return {
      allowed: false,
      reason: "Objednávku nemožno vrátiť späť do stavu vyjednávania.",
    };
  }

  if (to === "price_accepted") {
    if (actor !== "seller") {
      return { allowed: false, reason: "Cenu môže potvrdiť iba predajca." };
    }
    if (!["negotiating", "price_accepted", "cancelled"].includes(from)) {
      return { allowed: false, reason: "V tomto stave už nemožno potvrdiť cenu." };
    }
    return { allowed: true };
  }

  if (to === "address_provided") {
    if (actor !== "buyer") {
      return { allowed: false, reason: "Adresu môže odoslať iba kupujúci." };
    }
    if (!["price_accepted", "address_provided"].includes(from)) {
      return { allowed: false, reason: "Adresu teraz nie je možné odoslať." };
    }
    if (!hasShippingAddress) {
      return {
        allowed: false,
        reason: "Pre tento stav je povinná doručovacia adresa.",
      };
    }
    return { allowed: true };
  }

  if (to === "shipped") {
    if (actor !== "seller") {
      return { allowed: false, reason: "Balíček môže označiť iba predajca." };
    }
    if (!["address_provided", "shipped"].includes(from)) {
      return { allowed: false, reason: "Balíček možno odoslať až po adrese." };
    }
    return { allowed: true };
  }

  if (to === "delivered") {
    if (actor !== "buyer") {
      return { allowed: false, reason: "Doručenie môže potvrdiť iba kupujúci." };
    }
    if (!["shipped", "delivered"].includes(from)) {
      return {
        allowed: false,
        reason: "Doručenie možno potvrdiť až po odoslaní balíčka.",
      };
    }
    return { allowed: true };
  }

  if (to === "cancelled") {
    if (actor === "buyer" || actor === "seller") {
      return { allowed: true };
    }
  }

  return { allowed: false, reason: "Neplatný prechod stavu objednávky." };
}

// src/server/assign-role.ts
// Server-side function that uses the service role client to assign
// privileged roles. Called from sign-up after Supabase auth creates the user.
//
// Usage (from a TanStack Start server function):
//   import { assignRole } from "@/server/assign-role";
//   await assignRole(userId, "educator");

import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

const schema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["parent", "educator"]),
});

export const assignRole = createServerFn({ method: "POST" })
  .validator(schema)
  .handler(async ({ data }) => {
    const { userId, role } = data;

    if (role === "parent") {
      // parent is self-assigned via the RLS policy — call direct insert
      const { error } = await supabaseAdmin.from("user_roles").insert({
        user_id: userId,
        role: "parent",
      });
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    if (role === "educator") {
      // educator role must go through the SECURITY DEFINER function
      const { error } = await supabaseAdmin.rpc("assign_educator_role", {
        _user_id: userId,
      });
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    throw new Error("Invalid role");
  });

# P107-2 to P104-7 motherboard conductor

Source: user-provided high-resolution Tascam 38 amplifier schematic `p2(1).pdf`, right-hand motherboard connector region.

The enlarged motherboard drawing shows a conductor running from P107 contact 2 to P104 contact 7, with a visible connection at the P104-7 vertical conductor. This is a motherboard-side connection, not a card-side jumper.

The owner's `Junctions` worksheet calls J107-2 the 24 V supply but marks J104-7 `X`. The schematic connection is evidence that **P104-7 is not an isolated unused motherboard contact**. The proposed 24 V identity remains dependent on confirming P107-2's route to the supply connector.

Do not classify J104-7 as no-connect. Next: trace the matching J104-7 card-side node and P107-2 to P171/J171 supply.

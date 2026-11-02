# Function-board interface topology

Source: Tascam 38 high-resolution amplifier schematic `p2(1).pdf`, FUNCTION PCB and MOTHER PCB drawing.

The function board contains eight repeated channel-switch sections, each with three stacked switching elements. These feed three grouped connector assemblies: J174/P174, J175/P175 and J173/P173. The drawing separately depicts a FUNCTION LED PCB for eight channels. The three switch rows are not identical to the three audio selector FET branches Q110 INPUT, Q106 SYNC and Q105 REPRO: the latter are on the amplifier card and include active gating networks.

This distinction matters when constructing a mode truth table: follow each physical switch contact to its control net and then to the amplifier-card transistor gate/base. Do not equate switch position with transistor conduction without tracing voltage polarity and bias components.

The drawing also includes OUT SELECT PCB and its J180/P180 and J181/P181 connectors, separate from the FUNCTION PCB. Consequently the mode logic is distributed across more than one board; a standalone card must respect both sets of signals.

Status: block-level topology traced; per-contact control voltage and switching truth table not yet established.

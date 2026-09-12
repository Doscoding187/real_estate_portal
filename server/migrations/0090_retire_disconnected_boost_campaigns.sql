-- P8 Explore authority: retire the empty, disconnected boost-campaign table.
-- No reachable campaign writer, delivery API, billing authority, or feed reader
-- remains. A future sponsored-placement product must introduce one coherent
-- authorization, billing, delivery, and measurement model rather than reuse
-- this incompatible table.
DROP TABLE `boost_campaigns`;

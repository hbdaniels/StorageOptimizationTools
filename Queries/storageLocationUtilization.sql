SELECT
  bay,
  area,
  rowname,
  location,
  layer,
  COUNT(*) AS placeload_count
FROM
  wob_history
WHERE
  originator_action = 'PLACELOAD'
GROUP BY
  bay,
  area,
  rowname,
  location,
  layer
ORDER BY
  placeload_count DESC;
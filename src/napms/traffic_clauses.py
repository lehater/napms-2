"""Immutable, canonical TCP/UDP traffic clauses owned by an InteractionRevision."""
import json

from .domain import Problem


PORT_FIELDS = ("sourcePortStart", "sourcePortEnd", "destinationPortStart", "destinationPortEnd")


def canonical_clauses(values):
    """Validate and deterministically order a nonempty owned snapshot."""
    if not isinstance(values, list) or not 1 <= len(values) <= 32:
        raise Problem(422, "INVALID_TRAFFIC_CLAUSES", "Revision requires 1..32 traffic clauses")
    result = []
    signatures = set()
    for item in values:
        if not isinstance(item, dict) or item.get("ipProtocol") not in ("TCP", "UDP"):
            raise Problem(422, "INVALID_TRAFFIC_CLAUSE", "Only TCP/UDP clauses are supported")
        if set(item) != {"ipProtocol", *PORT_FIELDS}:
            raise Problem(422, "INVALID_TRAFFIC_CLAUSE", "Unsupported traffic clause fields")
        src_start, src_end = item["sourcePortStart"], item["sourcePortEnd"]
        dst_start, dst_end = item["destinationPortStart"], item["destinationPortEnd"]
        if ((src_start is None) != (src_end is None)
                or (src_start is not None and (
                    type(src_start) is not int or type(src_end) is not int
                    or not 1 <= src_start <= src_end <= 65535))
                or type(dst_start) is not int or type(dst_end) is not int
                or not 1 <= dst_start <= dst_end <= 65535):
            raise Problem(422, "INVALID_TRAFFIC_CLAUSE", "Invalid traffic interval")
        signature = (item["ipProtocol"], src_start, src_end, dst_start, dst_end)
        if signature in signatures:
            raise Problem(409, "DUPLICATE_TRAFFIC_CLAUSE", "Duplicate clause in the same revision")
        for previous in result:
            if previous["ipProtocol"] != item["ipProtocol"]:
                continue
            # Clauses are rectangles in (source port, destination port) space.
            # ANY participates in overlap checks without being rewritten in storage.
            old_source = (previous["sourcePortStart"] or 1, previous["sourcePortEnd"] or 65535)
            new_source = (src_start or 1, src_end or 65535)
            old_dest = (previous["destinationPortStart"], previous["destinationPortEnd"])
            new_dest = (dst_start, dst_end)
            def overlaps(left, right):
                return left[0] <= right[1] and right[0] <= left[1]
            if overlaps(old_source, new_source) and overlaps(old_dest, new_dest):
                raise Problem(409, "OVERLAPPING_TRAFFIC_CLAUSE", "Clauses cannot overlap in one revision")
        signatures.add(signature)
        result.append(dict(item))
    result.sort(key=lambda item: (
        item["ipProtocol"], item["sourcePortStart"] if item["sourcePortStart"] is not None else -1,
        item["sourcePortEnd"] if item["sourcePortEnd"] is not None else -1,
        item["destinationPortStart"], item["destinationPortEnd"]))
    return result


def stored_clauses(row):
    """Backcompat: v6 rows are immutable and project as a single original clause."""
    if "traffic_clauses_json" in row.keys() and row["traffic_clauses_json"] is not None:
        clauses = json.loads(row["traffic_clauses_json"])
    else:
        clauses = [{
            "ipProtocol": row["protocol"],
            "sourcePortStart": row["source_port_start"] if "source_port_start" in row.keys() else None,
            "sourcePortEnd": row["source_port_end"] if "source_port_end" in row.keys() else None,
            "destinationPortStart": row["port_start"],
            "destinationPortEnd": row["port_end"],
        }]
    return [dict(clauseIndex=index + 1, **item) for index, item in enumerate(clauses)]


def snapshot_json(clauses):
    return json.dumps(canonical_clauses(clauses), ensure_ascii=False, separators=(",", ":"), sort_keys=True)


def clause_summary(clauses):
    from .labels import traffic
    return "; ".join(traffic(item["ipProtocol"], item["destinationPortStart"], item["destinationPortEnd"],
                             item["sourcePortStart"], item["sourcePortEnd"]) for item in clauses)

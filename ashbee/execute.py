import frappe
from pprint import pprint


def patch_trailing_space():
    colours = frappe.get_all('Item Attribute Value', filters={'parent': 'Colour'}, fields=['attribute_value', 'name'])

    trailing_attributes = []

    for colour in colours:
        colour_value = colour.get('attribute_value')
        if colour_value[-1] == ' ':
            colour['attribute_value'] = colour_value.strip()
            trailing_attributes.append(colour)

    pprint(trailing_attributes)

    for attribute in trailing_attributes:
        frappe.db.sql("""
            UPDATE `tabItem Attribute Value`
            SET attribute_value = %(attribute_value)s
            WHERE name = %(name)s
        """, attribute)

    frappe.db.commit()


def generate_central_entries_from_purchase_invoices():
    central_project = frappe.db.get_single_value('Ashbee Settings', 'central_project')

    purchase_invoice_items = frappe.db.sql("""
        SELECT pii.amount, pii.name, pi.posting_date
        FROM `tabPurchase Invoice Item` pii
        INNER JOIN `tabPurchase Invoice` pi
        ON pii.parent = pi.name
        WHERE pii.project = %s
        AND pii.docstatus = 1
        AND (pii.ashbee_central_entry IS NULL OR pii.ashbee_central_entry = '')
    """, central_project, as_dict=True)

    for item in purchase_invoice_items:
        name = item.get('name')
        amount = item.get('amount')
        posting_date = item.get('posting_date')

        central_entry = frappe.get_doc({
            'doctype': 'Central Entry',
            'posting_date': posting_date,
            'voucher_type': 'Purchase Invoice',
            'voucher_detail_no': name,
            'allocation': amount
        }).insert()

        central_entry.submit()

        frappe.db.set_value('Purchase Invoice Item', name, 'ashbee_central_entry', central_entry.name)

    frappe.db.commit()


def generate_central_entries_from_direct_costs():
    central_project = frappe.db.get_single_value('Ashbee Settings', 'central_project')

    filters = {
        'docstatus': 1,
        'central_entry': '',
        'job_no': central_project
    }

    fields = ['name', 'posting_date', 'direct_cost']

    direct_cost_items = frappe.db.get_all(
        'Direct Cost Item',
        filters=filters,
        fields=fields
    )

    for item in direct_cost_items:
        direct_cost_item = item.get('name')
        direct_cost = item.get('direct_cost')
        posting_date = item.get('posting_date')

        central_entry = frappe.get_doc({
            'doctype': 'Central Entry',
            'posting_date': posting_date,
            'voucher_type': 'Direct Cost',
            'voucher_detail_no': direct_cost_item,
            'allocation': direct_cost
        }).insert()

        central_entry.submit()

        frappe.db.set_value('Direct Cost Item', direct_cost_item, 'central_entry', central_entry.name)

    frappe.db.commit()


def cancel_central_entry_direct_cost():
    filters = {'voucher_type': 'Direct Cost'}

    central_entries = frappe.get_all('Central Entry', filters=filters)

    for central_entry in central_entries:
        name = central_entry.get('name')
        frappe.get_doc('Central Entry', name).cancel()


def unlink_central_entry_from_direct_cost():
    filters = {'central_entry': ['!=', '']}
    direct_cost_items = frappe.get_all('Direct Cost Item', filters=filters)

    for item in direct_cost_items:
        frappe.db.sql("""
            UPDATE `tabDirect Cost Item`
            SET central_entry = ''
            WHERE name=%s
        """, item.get('name'))

    frappe.db.commit()

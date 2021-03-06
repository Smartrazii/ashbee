frappe.provide('ashbee.buying');

ashbee.buying.PurchaseOrderController = erpnext.buying.PurchaseOrderController.extend({
    onload: function(frm) {
        this._super();
        this.frm.set_query('item_code', 'items', function() {
            return { query: 'ashbee.queries.item_query' };
        });
    }
})

$.extend(cur_frm.cscript, new ashbee.buying.PurchaseOrderController({ frm: cur_frm }));
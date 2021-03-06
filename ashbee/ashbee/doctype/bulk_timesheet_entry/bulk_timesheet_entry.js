// Copyright (c) 2019, 9t9IT and contributors
// For license information, please see license.txt


frappe.ui.form.on('Bulk Timesheet Entry', {
	update_hourly_costs: function(frm) {
		frm.call({
			doc: frm.doc,
			method: 'update_hourly_costs',
			callback: function(r) {
				frm.save();
			}
		});
	}
});

frappe.ui.form.on('Bulk Timesheet Details', {
	details_add: function(frm, cdt, cdn) {
		set_start_date_time(frm, cdt, cdn);
		set_end_date_time(frm, cdt, cdn);
	},

	start_date_time: function(frm, cdt, cdn) {
		// calculate_hrs(frm, cdt, cdn);
		calculate_end_time(frm, cdt, cdn);
	},

	end_date_time: function(frm, cdt, cdn) {
		var child = locals[cdt][cdn];
		var time_diff = (moment(child.end_date_time).diff(moment(child.start_date_time),"seconds")) / ( 60 * 60 * 24);
		var std_working_hours = 0;

		if(frm._setting_hours) return;

		var hours = moment(child.end_date_time).diff(moment(child.start_date_time), "seconds") / 3600;
		std_working_hours = time_diff * frappe.working_hours;

		if (std_working_hours < hours && std_working_hours > 0) {
			frappe.model.set_value(cdt, cdn, "normal_hours", std_working_hours);
		} else {
			frappe.model.set_value(cdt, cdn, "normal_hours", hours);
		}
	},

	normal_hours: function(frm, cdt, cdn) {
		calculate_end_time(frm, cdt, cdn);
		calculate_total_cost(frm, cdt, cdn);
	},

	employee: function(frm, cdt, cdn) {
		var child = locals[cdt][cdn];
		if (child.employee) {
            frm.call({
                method: "get_employee_details",
                args: {"employee": child.employee},
                doc: frm.doc,
                callback: function (r) {
                    child.employee_name = r.message.name;
                    child.hourly_cost = r.message.rate;
                    refresh_field("employee_name", child.name, "details");
                    refresh_field("hourly_cost", child.name, "details");
                }
            });
        } else {
			frappe.throw(__('Please fill-up employee'));
		}
	},

	hourly_cost: function(frm, cdt, cdn) {
		calculate_total_cost(frm, cdt, cdn);
	},

	ot1_hours: function(frm, cdt, cdn) {
		calculate_total_cost(frm, cdt, cdn);
	},

	ot2_hours: function(frm, cdt, cdn) {
		calculate_total_cost(frm, cdt, cdn);
	},

	project: function(frm, cdt, cdn) {
		var child = locals[cdt][cdn];
		frm.call({
			method: "get_project_name",
			args: { 'project': child.project },
			doc: frm.doc,
			callback: function(r) {
				child.project_name = r.message;
				refresh_field("project_name",child.name, "details");
			}
		});
	},

	project_code: function(frm, cdt, cdn) {
		var child = locals[cdt][cdn];
		frm.call({
			method: "get_project_name_by_project_code",
			args: { 'project_code': child.project_code },
			doc: frm.doc,
			callback: function(r) {
				if (r.message) {
					var project = r.message[0];
					child.project = project.name;
					child.project_name = project.name;
					refresh_field("project", child.name, "details");
					refresh_field("project_name", child.name, "details");
				}
			}
		});
	}
});

var _set_default_start_datetime = function(datetime) {
	datetime.setHours(5);
	datetime.setMinutes(30);
	datetime.setSeconds(0);
	datetime.setMilliseconds(0);
};

var _set_default_end_datetime = function(datetime) {
	datetime.setHours(23);
	datetime.setMinutes(59);
	datetime.setSeconds(0);
	datetime.setMilliseconds(0);
};

var set_start_date_time = function(frm, cdt, cdn) {
	let child = locals[cdt][cdn];

	if(!child.start_date_time) {
		// if from_time value is not available then set the current datetime
		let start_date_time = new Date(frm.doc.posting_date);
		_set_default_start_datetime(start_date_time);

		frappe.model.set_value(cdt, cdn, "start_date_time", frappe.datetime.get_datetime_as_string(start_date_time));
	}
};

var set_end_date_time = function(frm, cdt, cdn) {
	let child = locals[cdt][cdn];

	if(!child.end_date_time) {
		let end_date_time = new Date(frm.doc.posting_date);
		_set_default_end_datetime(end_date_time);

		frappe.model.set_value(cdt, cdn, "end_date_time", frappe.datetime.get_datetime_as_string(end_date_time));
	}
};

var calculate_end_date_time = function(frm, cdt, cdn) {
	let child = locals[cdt][cdn];
	let d = moment(child.start_date_time);
	var time_diff = (moment(child.end_time).diff(moment(child.start_date_time),"seconds")) / (60 * 60 * 24);
		var std_working_hours = 0;
		var hours = moment(child.end_date_time).diff(moment(child.end_date_time), "seconds") / 3600;

		std_working_hours = time_diff * frappe.working_hours;

		if (std_working_hours < hours && std_working_hours > 0) {
			frappe.model.set_value(cdt, cdn, "normal_hours", std_working_hours);
			frappe.model.set_value(cdt, cdn, "end_date_time", d.add(hours, "normal_hours").format(frappe.defaultDatetimeFormat));
		} else {
			d.add(child.normal_hours, "hours");
			frm._setting_hours = true;
			frappe.model.set_value(cdt, cdn, "end_date_time",
				d.format(frappe.defaultDatetimeFormat)).then(() => {
					frm._setting_hours = false;
				});
		}
};


var calculate_end_time = function(frm, cdt, cdn) {
	let child = locals[cdt][cdn];

	set_start_date_time (frm, cdt, cdn);
	if(child.normal_hours) {
		calculate_end_date_time(frm, cdt, cdn);
	}
};

var calculate_ots = function(frm, cdt, cdn){
	let child = locals[cdt][cdn];

	child.ot1 = parseFloat(child.ot1_hours * child.hourly_cost * 1.25) || 0.0;
	child.ot2 = parseFloat(child.ot2_hours * child.hourly_cost * 1.50) || 0.0;

	refresh_field("ot1", child.name, "details");
	refresh_field("ot2", child.name, "details");
};

var calculate_total_cost = function(frm, cdt, cdn){
	var child = locals[cdt][cdn];
	var normal_hours = child.normal_hours == undefined ? 0 : child.normal_hours;
	var hourly_cost = child.hourly_cost == undefined ? 0 : child.hourly_cost;
	child.normal_cost = normal_hours * hourly_cost
	refresh_field("normal_cost", child.name, "details");
	calculate_ots(frm, cdt, cdn);
	child.total_cost = child.normal_cost + child.ot1 + child.ot2;
	refresh_field("total_cost", child.name, "details");
};

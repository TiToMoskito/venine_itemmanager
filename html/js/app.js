$(document).ready(function () {

    var table = $('#dataTable').DataTable({
        orderCellsTop: true,
        fixedHeader: true,
        "order": [[0, 'asc']],
        "pageLength": 10,
        "lengthMenu": [[10, 25, 50, -1], [10, 25, 50, 150, 200, "All"]],
        "columnDefs": [
            { "searchable": false, "targets": 2 },
            { "searchable": false, "targets": 3 },
            { "searchable": false, "targets": 4 },
            { "searchable": false, "targets": 5 }
        ]

    });

    $.get('/get_data', function (result) {
        table.clear().draw();
        for (i = 0; i < result.length; ++i) {
            table.row.add([result[i].key, result[i].label, result[i].weight, result[i].stack, result[i].close, `<a href="/deleteitem/${result[i].key}" class="btn btn-danger">Delete</a>`]).draw().node();
        }
    });

    $('#dataTable tbody').on('click', 'tr', function () {
        var data = table.row(this).data();
        window.location.href = `/item/edit/${data[0]}`;
    });
});
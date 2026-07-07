<?php
include("ka_include/session.php");
include("ka_include/common_function.php");
include("ka_include/ka_config.php");
include("ka_include/check_admin_login.php");
$tod_date = date("Y-m-d");
$upc_date = date("Y-m-d", strtotime($tod_date . ' + 3 days'));
// echo $tod_date; exit;

// Check Module Rights
$query_module_detail = "SELECT * FROM admin_login ld where adm_id='" . $_SESSION['adm_id'] . "' and adm_status=1";
$module_query = $con->query($query_module_detail);
$row_md_id = $module_query->fetch_array();

$md_right = explode(",", $row_md_id['md_id']);
if ($_SESSION['adm_type'] == 0) { // Admin 

  $query_lic_tot = "SELECT * FROM rto_detail td, status_detail st  where td.rto_status!=3 and td.rto_action IN (1,2) and td.service_id=1 and st.status_id=td.rto_status and td.branch_id=" . $_SESSION['adm_branch'] . " and Date(td.rto_duedate) >= '$tod_date' and Date(td.rto_duedate) <= '$upc_date' ORDER BY td.rto_id";
  $result_tot_lic = $con->query($query_lic_tot);
  $total_records_lic = $result_tot_lic->num_rows;

  $query_lic = "SELECT * FROM rto_detail td, status_detail st  where td.rto_status!=3 and td.rto_action IN (1,2) and td.service_id=1 and st.status_id=td.rto_status and td.branch_id=" . $_SESSION['adm_branch'] . " and Date(td.rto_duedate) >= '$tod_date' and Date(td.rto_duedate) <= '$upc_date' ORDER BY td.rto_id";
  
  $query_vhn_tot = "SELECT * FROM rto_detail td, status_detail st  where td.rto_status!=3 and td.rto_action IN (1,2) and td.service_id=2 and st.status_id=td.rto_status and td.branch_id=" . $_SESSION['adm_branch'] . " and Date(td.rto_duedate) >= '$tod_date' and Date(td.rto_duedate) <= '$upc_date' ORDER BY td.rto_id";
  $result_tot_vhn = $con->query($query_vhn_tot);
  $total_records_vhn = $result_tot_vhn->num_rows;

  $query_vhn = "SELECT * FROM rto_detail td, status_detail st  where td.rto_status!=3 and td.rto_action IN (1,2) and td.service_id=2 and st.status_id=td.rto_status and td.branch_id=" . $_SESSION['adm_branch'] . " and Date(td.rto_duedate) >= '$tod_date' and Date(td.rto_duedate) <= '$upc_date' ORDER BY td.rto_id";
} else {
  $query_lic_tot = "SELECT * FROM rto_detail td,  status_detail st  where td.rto_status!=3 and td.rto_action IN (1,2) and td.service_id=1 and st.status_id=td.rto_status and td.branch_id=" . $_SESSION['adm_branch'] . " and Date(td.rto_duedate) >= '$tod_date' and Date(td.rto_duedate) <= '$upc_date' and td.rto_adm_id=" . $_SESSION['adm_id'] . " ORDER BY td.rto_id";
  $result_tot_lic = $con->query($query_lic_tot);
  $total_records_lic = $result_tot_lic->num_rows;

  $query_lic = "SELECT * FROM rto_detail td, status_detail st  where td.rto_status!=3 and td.rto_action IN (1,2) and td.service_id=1 and st.status_id=td.rto_status and td.branch_id=" . $_SESSION['adm_branch'] . " and Date(td.rto_duedate) >= '$tod_date' and Date(td.rto_duedate) <= '$upc_date' and td.rto_adm_id=" . $_SESSION['adm_id'] . " ORDER BY td.rto_id";
  
  $query_vhn_tot = "SELECT * FROM rto_detail td,  status_detail st  where td.rto_status!=3 and td.rto_action IN (1,2) and td.service_id=2 and st.status_id=td.rto_status and td.branch_id=" . $_SESSION['adm_branch'] . " and Date(td.rto_duedate) >= '$tod_date' and Date(td.rto_duedate) <= '$upc_date' and td.rto_adm_id=" . $_SESSION['adm_id'] . " ORDER BY td.rto_id";
  $result_tot_vhn = $con->query($query_vhn_tot);
  $total_records_vhn = $result_tot_vhn->num_rows;

  $query_vhn = "SELECT * FROM rto_detail td, status_detail st  where td.rto_status!=3 and td.rto_action IN (1,2) and td.service_id=2 and st.status_id=td.rto_status and td.branch_id=" . $_SESSION['adm_branch'] . " and Date(td.rto_duedate) >= '$tod_date' and Date(td.rto_duedate) <= '$upc_date' and td.rto_adm_id=" . $_SESSION['adm_id'] . " ORDER BY td.rto_id";
}
?>
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <meta name="author" content="">
  <link rel="shortcut icon" href="img/favicon.png" type="image/png">
  <title>RTO Dashboard - <?php echo $meta_title; ?> </title>
  <link href="css/style.default.css" rel="stylesheet">
  <link href="css/jquery.datatables.css" rel="stylesheet">

  <script src="js/jquery-1.11.1.min.js"></script>
  <!--<script src="js/new-jquery-3.3.1.js"></script>-->
  <script src="js/new-table.js"></script>
  <link href="css/new-table.css" rel="stylesheet">
  <script type="text/javascript">
    $(document).ready(function() {
      // Setup - add a text input to each footer cell
      $('#example tfoot th').each(function() {
        var title = $(this).text();
        $(this).html('<input type="text" placeholder="' + title + '" />');
      });

      // DataTable
      var table = $('#example').DataTable();
      var table = $('#example_two').DataTable();
      var table = $('#example_three').DataTable();

      // Apply the search
      table.columns().every(function() {
        var that = this;

        $('input', this.footer()).on('keyup change', function() {
          if (that.search() !== this.value) {
            that
              .search(this.value)
              .draw();
          }
        });
      });
    });
    $(document).ready(function() {
      // Setup - add a text input to each footer cell
      $('#example_two tfoot th').each(function() {
        var title = $(this).text();
        $(this).html('<input type="text" placeholder="' + title + '" />');
      });

      // DataTable
      var table = $('#example_two').DataTable();

      // Apply the search
      table.columns().every(function() {
        var that = this;

        $('input', this.footer()).on('keyup change', function() {
          if (that.search() !== this.value) {
            that
              .search(this.value)
              .draw();
          }
        });
      });
    });
  </script>
  <style>
    tfoot input {
      width: 100%;
      padding: 3px;
      box-sizing: border-box;
    }
  </style>
</head>

<body>
  <!-- Preloader -->
  <div id="preloader">
    <div id="status"><i class="fa fa-spinner fa-spin"></i></div>
  </div>
  <section>
    <?php include("left-column.php"); ?>
    <div class="mainpanel">
      <?php include("header.php"); ?>
      <div class="pageheader">
        <h2><i class="fa fa-home"></i> RTO Dashboard</h2>
        <div class="breadcrumb-wrapper"> <span class="label">You are here:</span>
          <ol class="breadcrumb">
            <li><a style="color:#1C1B17" href="#">Home</a></li>
            <li class="active">RTO Dashboard</li>
          </ol>
        </div>
      </div>
      <div class="contentpanel">
        <div class="panel panel-default">
          <div class="panel-body">
          <div class="table-responsive col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <h3 class="text-center" style="font-weight: bold; color: #DA261C;">Upcoming 3 Days -  License Work </h3>
              <table id="example" class="table table-success mb30 table-hover table-bordered display" style="color:#000;">
                <thead bgcolor="#82c21f">
                  <tr>
                    <th width="5%">ID</th>
                    <th width="10%">Date</th>
                    <th width="10%">Due Date</th>
                     <th width="10%">Name</th>
                    <th width="10%">Contact</th>
                    <th width="10%">Amount</th>
                    <th width="10%">Assign</th>
                    <th width="10%">Status</th>
                    <th width="10%">Action</th>
                  </tr>
                </thead>
                <tbody>
                  <?php
                  if ($total_records_lic != 0) {
                    $i = 0;
                  ?>
                    <?php
                    $result = $con->query($query_lic);
                    while ($row_lic = $result->fetch_object()) {
                    ?>
                      <tr class="odd gradeX">


                        <td><?php echo $row_lic->rto_id; ?></td>
                        <td>
                          <?php
                          $datend = new DateTime($row_lic->rto_date);
                          echo $datend->format('d-m-Y'); ?>
                        </td>
                        <td>
                          <?php
                          $datend = new DateTime($row_lic->rto_duedate);
                          echo $datend->format('d-m-Y'); ?>
                        </td>
                         <td><a title="Edit" style="color:green;" href="license_edit.php?rto_id=<?php echo $row_lic->rto_id ?>"><?php echo $row_lic->rto_name; ?></a></td>
                        <td><?php echo $row_lic->rto_contact; ?></td>
                        <td><?php echo $row_lic->rto_amount . " - " . $row_lic->rto_credit . " = " . $row_lic->rto_debit; ?></td>
                        <td><?php
                            if ($row_lic->rto_adm_id != 0) {
                              $query_asign_detail = "SELECT * FROM admin_login ld where ld.adm_id=" . $row_lic->rto_adm_id;
                              $asign_query = $con->query($query_asign_detail);
                              $row_asign = $asign_query->fetch_object();
                              $asign_name = $row_asign->adm_username;
                              echo $asign_name;
                            } ?></td>
                        <td style="color: <?php if ($row_lic->rto_action == 2 || $row_lic->rto_action == 3) { ?>green<?php } elseif ($row_lic->rto_action == 1) { ?>red;<?php } ?>">
                          <?php if ($row_lic->rto_action == 2) {
                            echo "Completed";
                          } elseif ($row_lic->rto_action == 1) {
                            echo "Pending - ";
                            $query_rejres_detail = "SELECT * FROM pen_res_detail ld where ld.pen_res_id=" . $row_lic->pen_res_id;
                            $rejres_query = $con->query($query_rejres_detail);
                            $row_rejres = $rejres_query->fetch_object();
                            $rejres_name = $row_rejres->pen_res_name;
                            echo $rejres_name;
                          } elseif ($row_lic->rto_action == 3) {
                            echo "Document Delivered";
                          }
                          ?>
                        </td>

                        <!-- <a  title="Follow Up"style="color:#1C1B17; cursor:pointer; " onClick="return license_followup(<?php // echo $row_lic->rto_id
                                                                                                                          ?>);" ><i class="fa fa-comment"></i></a> |  -->
                        <td width="17%"><code> <a target="_blank" style="color:#333;" title="Documents" href="license_documents.php?rto_id=<?php echo $row_lic->rto_id ?>"><i class="fa fa-image"></i></a> | <a title="Edit" style="color:green;" href="license_edit.php?rto_id=<?php echo $row_lic->rto_id ?>"><i class="fa fa-pen"></i></a> <code></td>
                      </tr>
                  <?php }
                  } ?>
                </tbody>
                <!-- <tfoot>
                  <tr>
                    <th width="5%" width="8%">ID</th>
                    <th width="10%">Date</th>
                    <th width="10%">Due Date</th>
                     <th width="10%">Name</th>
                    <th width="10%">Contact</th>
                    <th width="10%">Amount</th>
                    <th width="10%">Assign</th>
                    <th width="10%">Status</th>
                    <th width="10%">Action</th>
                  </tr>
                </tfoot> -->
              </table>




            </div>

            <div class="table-responsive col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <h3 class="text-center" style="font-weight: bold; color: #DA261C;">Upcoming 3 Days -  Vahan Work </h3>
              <table id="example_two" class="table table-success mb30 table-hover table-bordered display" style="color:#000;">
                <thead bgcolor="#82c21f">
                  <tr>
                    <th width="5%">ID</th>
                    <th width="10%">Date</th>
                    <th width="10%">Due Date</th>
                    <th width="10%">Register No.</th>
                    <th width="10%">Name</th>
                    <th width="10%">Contact</th>
                    <th width="10%">Amount</th>
                    <th width="10%">Assign</th>
                    <th width="10%">Status</th>
                    <th width="10%">Action</th>
                  </tr>
                </thead>
                <tbody>
                  <?php
                  if ($total_records_vhn != 0) {
                    $i = 0;
                  ?>
                    <?php
                    $result = $con->query($query_vhn);
                    while ($row_vhn = $result->fetch_object()) {
                    ?>
                      <tr class="odd gradeX">


                        <td><?php echo $row_vhn->rto_id; ?></td>
                        <td>
                          <?php
                          $datend = new DateTime($row_vhn->rto_date);
                          echo $datend->format('d-m-Y'); ?>
                        </td>
                        <td>
                          <?php
                          $datend = new DateTime($row_vhn->rto_duedate);
                          echo $datend->format('d-m-Y'); ?>
                        </td>
                        <td><?php echo $row_vhn->rto_regno; ?></td>
                        <td><a title="Edit" style="color:green;" href="vahan_edit.php?rto_id=<?php echo $row_vhn->rto_id ?>"><?php echo $row_vhn->rto_name; ?></a></td>
                        <td><?php echo $row_vhn->rto_contact; ?></td>
                        <td><?php echo $row_vhn->rto_amount . " - " . $row_vhn->rto_credit . " = " . $row_vhn->rto_debit; ?></td>
                        <td><?php
                            if ($row_vhn->rto_adm_id != 0) {
                              $query_asign_detail = "SELECT * FROM admin_login ld where ld.adm_id=" . $row_vhn->rto_adm_id;
                              $asign_query = $con->query($query_asign_detail);
                              $row_asign = $asign_query->fetch_object();
                              $asign_name = $row_asign->adm_username;
                              echo $asign_name;
                            } ?></td>
                        <td style="color: <?php if ($row_vhn->rto_action == 2 || $row_vhn->rto_action == 3) { ?>green<?php } elseif ($row_vhn->rto_action == 1) { ?>red;<?php } ?>">
                          <?php if ($row_vhn->rto_action == 2) {
                            echo "Completed";
                          } elseif ($row_vhn->rto_action == 1) {
                            echo "Pending - ";
                            $query_rejres_detail = "SELECT * FROM pen_res_detail ld where ld.pen_res_id=" . $row_vhn->pen_res_id;
                            $rejres_query = $con->query($query_rejres_detail);
                            $row_rejres = $rejres_query->fetch_object();
                            $rejres_name = $row_rejres->pen_res_name;
                            echo $rejres_name;
                          } elseif ($row_vhn->rto_action == 3) {
                            echo "Document Delivered";
                          }
                          ?>
                        </td>

                        <!-- <a  title="Follow Up"style="color:#1C1B17; cursor:pointer; " onClick="return vahan_followup(<?php // echo $row_vhn->rto_id
                                                                                                                          ?>);" ><i class="fa fa-comment"></i></a> |  -->
                        <td width="17%"><code> <a target="_blank" style="color:#333;" title="Documents" href="vahan_documents.php?rto_id=<?php echo $row_vhn->rto_id ?>"><i class="fa fa-image"></i></a> | <a title="Edit" style="color:green;" href="vahan_edit.php?rto_id=<?php echo $row_vhn->rto_id ?>"><i class="fa fa-pen"></i></a> <code></td>
                      </tr>
                  <?php }
                  } ?>
                </tbody>
                <!-- <tfoot>
                  <tr>
                    <th width="5%" width="8%">ID</th>
                    <th width="10%">Date</th>
                    <th width="10%">Due Date</th>
                    <th width="10%">Register No.</th>
                    <th width="10%">Name</th>
                    <th width="10%">Contact</th>
                    <th width="10%">Amount</th>
                    <th width="10%">Assign</th>
                    <th width="10%">Status</th>
                    <th width="10%">Action</th>
                  </tr>
                </tfoot> -->
              </table>




            </div>
            
           



          </div>
        </div>
      </div>

    </div>
    <!-- mainpanel -->
    <!-- rightpanel -->
  </section>
  <script src="js/jquery-1.11.1.min.js"></script>
  <script src="js/jquery-migrate-1.2.1.min.js"></script>
  <script src="js/jquery-ui-1.10.3.min.js"></script>
  <script src="js/bootstrap.min.js"></script>
  <script src="js/modernizr.min.js"></script>
  <script src="js/jquery.sparkline.min.js"></script>
  <script src="js/toggles.min.js"></script>
  <script src="js/retina.min.js"></script>
  <script src="js/jquery.cookies.js"></script>
  <script src="js/flot/jquery.flot.min.js"></script>
  <script src="js/flot/jquery.flot.resize.min.js"></script>
  <script src="js/flot/jquery.flot.spline.min.js"></script>
  <script src="js/morris.min.js"></script>
  <script src="js/raphael-2.1.0.min.js"></script>
  <script src="js/jquery.datatables.min.js"></script>
  <script src="js/select2.min.js"></script>
  <script src="js/custom.js"></script>
  <script>
    jQuery(document).ready(function() {
      "use strict";
      jQuery('#table1').dataTable();
      jQuery('#table2').dataTable({
        "sPaginationType": "full_numbers"
      });
      // Select2
      jQuery('select').select2({
        minimumResultsForSearch: -1
      });
      jQuery('select').removeClass('form-control');
      // Delete row in a table
      jQuery('.delete-row').click(function() {
        var c = confirm("Continue delete?");
        if (c)
          jQuery(this).closest('tr').fadeOut(function() {
            jQuery(this).remove();
          });
        return false;
      });
      // Show aciton upon row hover
      jQuery('.table-hidaction tbody tr').hover(function() {
        jQuery(this).find('.table-action-hide a').animate({
          opacity: 1
        });
      }, function() {
        jQuery(this).find('.table-action-hide a').animate({
          opacity: 0
        });
      });
    });
  </script>
  <script src="js/dashboard.js"></script>
</body>

</html>